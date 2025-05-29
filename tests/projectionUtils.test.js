'use strict'

const tap = require('tap')
const { resolveProjection } = require('../lib/projectionUtils')
const BadRequestError = require('../lib/BadRequestError')

const loggerMock = {
  trace: () => {

    /* NOOP */
  },
  debug: () => {

    /* NOOP */
  },
  info: () => {

    /* NOOP */
  },
  warn: () => {

    /* NOOP */
  },
  error: () => {

    /* NOOP */
  },
}

const DOCUMENT_FIELDS = [
  'street',
  'number',
  'zipCode',
  'city',
  'province',
  'state',
  'isResidence',
  'createdAt',
]

const RAW_PROJECTION_PLAIN_INCLUSIVE = JSON.stringify({
  street: 1,
  number: 1,
  zipCode: true,
})

const RAW_PROJECTION_PLAIN_EXCLUSIVE = JSON.stringify({
  street: 0,
  number: 0,
  zipCode: false,
})

tap.test('Projection Utils tests', async t => {
  await t.test('resolveProjection', async t => {
    await t.test('OK - no projection provided', async assert => {
      const parsedProjection = resolveProjection(
        undefined,
        undefined,
        undefined,
        undefined,
        loggerMock
      )

      assert.strictSame(parsedProjection, { _id: 1 })
    })

    await t.test(`OK - simple without ACL`, async t => {
      const cases = [
        {
          clientProjection: undefined,
          rawProjection: undefined,
          expected: {
            street: 1,
            number: 1,
            zipCode: 1,
            city: 1,
            province: 1,
            state: 1,
            isResidence: 1,
            createdAt: 1,
          },
        },
        {
          clientProjection: 'street,number,zipCode',
          rawProjection: undefined,
          expected: { street: 1, number: 1, zipCode: 1 },
        },
        {
          clientProjection: undefined,
          rawProjection: RAW_PROJECTION_PLAIN_INCLUSIVE,
          expected: { street: 1, number: 1, zipCode: true },
        },
        {
          clientProjection: undefined,
          rawProjection: RAW_PROJECTION_PLAIN_EXCLUSIVE,
          expected: {
            street: 0,
            number: 0,
            zipCode: false,
          },
        },
        {
          clientProjection: undefined,
          rawProjection: JSON.stringify({ 'street': '$street' }),
          expected: {
            street: '$street',
          },
        },
      ]

      for (const [idx, { clientProjection, rawProjection, expected }] of cases.entries()) {
        await t.test(`${idx}`, async assert => {
          const parsedProjection = resolveProjection(
            clientProjection,
            undefined,
            DOCUMENT_FIELDS,
            rawProjection,
            loggerMock
          )

          assert.strictSame(
            parsedProjection,
            expected
          )
        })
      }
    })

    await t.test(`OK - simple with ACL`, async t => {
      const cases = [
        {
          clientProjection: undefined,
          rawProjection: undefined,
          expected: {
            street: 1,
            zipCode: 1,
          },
        },
        {
          clientProjection: 'street,number,zipCode',
          rawProjection: undefined,
          expected: { street: 1, zipCode: 1 },
        },
        {
          clientProjection: undefined,
          rawProjection: RAW_PROJECTION_PLAIN_INCLUSIVE,
          expected: { street: 1, zipCode: true },
        },
        {
          clientProjection: undefined,
          rawProjection: JSON.stringify({ 'street': '$street' }),
          expected: {
            street: '$street',
          },
        },
      ]

      for (const [idx, { clientProjection, rawProjection, expected }] of cases.entries()) {
        await t.test(`${idx}`, async assert => {
          const parsedProjection = resolveProjection(
            clientProjection,
            'street,zipCode',
            DOCUMENT_FIELDS,
            rawProjection,
            loggerMock
          )

          assert.strictSame(
            parsedProjection,
            expected
          )
        })
      }
    })

    await t.test(`OK - aggregation without ACL`, async t => {
      const cases = [
        {
          rawProjection: JSON.stringify({
            city: {
              $filter: {
                input: '$city',
                as: 'item',
                cond: {
                  $in: [
                    '$$item.name', ['note'],
                  ],
                },
              },
            },
          }),
          expected: {
            city: {
              $filter: {
                input: '$city',
                as: 'item',
                cond: {
                  $in: [
                    '$$item.name', ['note'],
                  ],
                },
              },
            },
          },
        },
        {
          rawProjection: JSON.stringify({
            city: { $first: '$city' },
          }),
          expected: {
            city: { $first: '$city' },
          },
        },
        {
          rawProjection: JSON.stringify({
            createdAt: {
              $dateToString: {
                date: '$createdAt',
                format: '%H',
                // same as offset below (+ 10)
                timezone: '+10:00',
              },
            },
          }),
          expected: {
            createdAt: {
              $dateToString: {
                date: '$createdAt',
                format: '%H',
                // same as offset below (+ 10)
                timezone: '+10:00',
              },
            },
          },
        },
      ]

      for (const [idx, { clientProjection, rawProjection, expected }] of cases.entries()) {
        await t.test(`${idx}`, async assert => {
          const parsedProjection = resolveProjection(
            clientProjection,
            undefined,
            DOCUMENT_FIELDS,
            rawProjection,
            loggerMock
          )

          assert.strictSame(
            parsedProjection,
            expected
          )
        })
      }
    })

    await t.test(`KO - return Bad Request due to ACL`, async t => {
      const cases = [
        {
          clientProjection: undefined,
          rawProjection: JSON.stringify({ 'city': '$city' }),
          expectedError: new BadRequestError('Operator $city is not allowed in raw projection'),
        },
        {
          clientProjection: undefined,
          rawProjection: RAW_PROJECTION_PLAIN_EXCLUSIVE,
          expectedError: new BadRequestError('_rawp exclusive projection is overriding at least one acl_read_column value'),
        },
      ]

      for (const [idx, { clientProjection, rawProjection, expectedError }] of cases.entries()) {
        await t.test(`${idx}`, async assert => {
          try {
            resolveProjection(
              clientProjection,
              'street,zipCode',
              DOCUMENT_FIELDS,
              rawProjection,
              loggerMock
            )
            assert.fail()
          } catch (error) {
            assert.match(error, expectedError)
          }
        })
      }
    })

    await t.test(`KO - operator not allowed`, async t => {
      const cases = [
        {
          rawProjection: {
            city: { $first: '$$ROOT' },
          },
          unwantedOperator: '$$ROOT',
        },
        {
          rawProjection: {
            city: { $first: ['$$ROOT'] },
          },
          unwantedOperator: '$$ROOT',
        },
        {
          rawProjection: {
            city: '$$ROOT',
          },
          unwantedOperator: '$$ROOT',
        },
        {
          rawProjection: {
            city: '$$CURRENT',
          },
          unwantedOperator: '$$CURRENT',
        },
        {
          rawProjection: {
            city: [{ branch: 'node' }, { leaves: '$$PRUNE' }],
          },
          unwantedOperator: '$$PRUNE',
        },
        {
          rawProjection: {
            $cond: { if: { val: '$$CURRENT' }, then: '$$ROOT', else: null },
          },
          unwantedOperator: '$$CURRENT',
        },
        {
          rawProjection: {
            remove: '$$REMOVE',
          },
          unwantedOperator: '$$REMOVE',
        },
        {
          rawProjection: {
            descend: '$$DESCEND',
          },
          unwantedOperator: '$$DESCEND',
        },
        {
          rawProjection: {
            keep: '$$KEEP',
          },
          unwantedOperator: '$$KEEP',
        },
        {
          rawProjection: {
            clusterTime: '$$CLUSTER_TIME',
          },
          unwantedOperator: '$$CLUSTER_TIME',
        },
        {
          rawProjection: {
            now: '$$NOW',
          },
          unwantedOperator: '$$NOW',
        },
        {
          rawProjection: {
            doc: { $concatArrays: [['$city'], ['$$ROOT']] },
          },
          unwantedOperator: '$$ROOT',
        },
        {
          rawProjection: {
            reduce: {
              $reduce: {
                rawProjection: '$city',
                initialValue: '$$ROOT',
                in: {
                  count: { $sum: 1 },
                },
              },
            },
          },
          unwantedOperator: '$$ROOT',
        },
        {
          rawProjection: {
            doc: {
              $in: ['$$CURRENT'],
            },
          },
          unwantedOperator: '$$CURRENT',
        },
      ]


      for (const [idx, { rawProjection, unwantedOperator }] of cases.entries()) {
        await t.test(`${idx}`, async assert => {
          try {
            resolveProjection(
              undefined,
              undefined,
              DOCUMENT_FIELDS,
              JSON.stringify(rawProjection),
              loggerMock
            )
            assert.fail()
          } catch (error) {
            assert.match(error, new BadRequestError(`Operator ${unwantedOperator} is not allowed in raw projection`))
          }
        })
      }
    })
  })
})
