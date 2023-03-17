/*
 * Copyright 2023 Mia s.r.l.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const tap = require('tap')
const path = require('path')
const { ObjectId } = require('mongodb')
const { readdirSync } = require('fs')

const { STATES, __STATE__ } = require('../lib/consts')
const { newUpdaterId, fixtures } = require('./utils')
const { setUpTest, prefix } = require('./httpInterface.utils')

tap.test('HTTP POST /bulk', async t => {
  const nowDate = new Date()
  const DOCS = [
    {
      name: 'foo',
      isbn: 'aaaaaa',
      price: 33.33,
      publishDate: nowDate,
      position: [4.1, 4.3, 2.1],
      additionalInfo: {
        footnotePages: [2, 3, 5, 23, 3],
        notes: {
          mynote: 'good',
        },
      },
      attachments: [
        {
          name: 'me',
        },
        {
          name: 'another',
          size: 50,
          more: ['stuff'],
        },
      ],
    },
    {
      name: 'bar',
      isbn: 'bbbbbb',
      price: 20.0,
      position: [2.1, 8.5],
      isPromoted: true,
    },
    {
      name: 'foobar',
      isbn: 'cccccc',
      price: 10.0,
    },
  ]

  const { fastify, collection, resetCollection } = await setUpTest(t)

  t.test('ok', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: DOCS,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.strictSame(response.statusCode, 200, response.payload)
      t.end()
    })
    t.test('should return application/json', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.test('should return the inserted ids', t => {
      const body = JSON.parse(response.payload)
      t.strictSame(body.length, DOCS.length)
      body.forEach(el => t.ok(el._id))
      t.end()
    })

    t.test('GET /<id>', t => {
      const body = JSON.parse(response.payload)

      body.forEach((doc, index) => {
        t.test(`GET /doc${index}`, async t => {
          const response = await fastify.inject({
            method: 'GET',
            url: `${prefix}/${doc._id}?_st=${STATES.DRAFT}`,
          })

          t.test('should return 200', t => {
            t.strictSame(response.statusCode, 200)
            t.end()
          })
        })
      })

      t.end()
    })

    t.test('on database', async t => {
      const body = JSON.parse(response.payload)

      const doc1 = await collection.findOne({ _id: new ObjectId(body[0]._id) })
      const doc2 = await collection.findOne({ _id: new ObjectId(body[1]._id) })

      const docs = [doc1, doc2]
      docs.forEach((doc, index) => {
        t.test(`doc${index}`, t => {
          const docKeys = Object.keys(DOCS[index])

          docKeys.forEach(k => {
            t.test(`should have ${k}`, t => {
              if (k === 'position') {
                t.strictSame(doc[k], { type: 'Point', coordinates: DOCS[index][k] })
              } else {
                t.strictSame(doc[k], DOCS[index][k])
              }
              t.end()
            })
          })

          t.test('should have creatorId', t => {
            t.strictSame(doc.creatorId, newUpdaterId)
            t.end()
          })
          t.test('should have updaterId', t => {
            t.strictSame(doc.updaterId, newUpdaterId)
            t.end()
          })
          t.test('should have createdAt', t => {
            t.ok(Date.now() - doc.createdAt < 5000, '`createdAt` should be set')
            t.end()
          })
          t.test('should have updatedAt', t => {
            t.ok(Date.now() - doc.updatedAt < 5000, '`updatedAt` should be set')
            t.end()
          })
          t.test('should have __STATE__ in DRAFT', t => {
            t.strictSame(doc[__STATE__], STATES.DRAFT)
            t.end()
          })

          t.end()
        })
      })
    })
  })

  t.test('violate index uniqueness', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: [
        {
          name: 'name1',
          isbn: 'aaaa',
        },
        {
          name: 'name2',
          isbn: 'aaaa',
        },
      ],
      headers: {
        userId: newUpdaterId,
      },
    })

    t.strictSame(response.statusCode, 422)
    t.ok(/application\/json/.test(response.headers['content-type']))

    t.test('on database', async t => {
      const count = await collection.countDocuments({})
      t.strictSame(count, fixtures.length + 1, 'only the first was inserted')
    })
  })

  t.test('bulk bigger than 1 MB', async t => {
    function dummyBulk(n) {
      return Array.from({ length: n }, (v, k) => ({
        name: k.toString(),
        isbn: k.toString(),
      }))
    }

    await resetCollection()
    const n = 50000

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: dummyBulk(n),
      headers: {
        userId: newUpdaterId,
      },
    })

    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))

    t.test('on database', async t => {
      const count = await collection.countDocuments({})
      t.strictSame(count, fixtures.length + n)
    })
  })

  t.test('violate required constraints (no isbn)', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: [
        {
          name: 'name1',
        },
      ],
      headers: {
        userId: newUpdaterId,
      },
    })

    t.strictSame(response.statusCode, 400)
    t.ok(/application\/json/.test(response.headers['content-type']))

    t.test('on database', async t => {
      const count = await collection.countDocuments({})
      t.strictSame(count, fixtures.length, 'no insertions on database')
    })
  })

  t.test('allow nullable field', async t => {
    const nowDate = new Date()
    const DOCS = [
      {
        name: null,
        isbn: 'aaaaaa',
        price: null,
        publishDate: nowDate,
        position: [4.1, 4.3, 2.1],
        additionalInfo: {
          footnotePages: [2, 3, 5, 23, 3],
          notes: {
            mynote: 'good',
          },
        },
        attachments: [
          {
            name: 'me',
          },
          {
            name: 'another',
            size: 50,
            more: ['stuff'],
          },
        ],
        __STATE__: 'PUBLIC',
      },
      {
        name: null,
        isbn: 'bbbbbb',
        price: 20.0,
        position: [2.1, 8.5],
        isPromoted: true,
        __STATE__: 'PUBLIC',
      },
      {
        name: null,
        isbn: 'cccccc',
        price: 10.0,
        __STATE__: 'PUBLIC',
      },
    ]

    t.test('ok', async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/bulk`,
        payload: DOCS,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200, response.payload)
        t.end()
      })

      t.test('should return application/json', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the inserted ids', t => {
        const body = JSON.parse(response.payload)
        t.strictSame(body.length, DOCS.length)
        body.forEach(el => t.ok(el._id))
        t.end()
      })

      t.test('GET /<id>', t => {
        const body = JSON.parse(response.payload)

        body.forEach((doc, index) => {
          t.test(`GET /doc${index}`, async t => {
            const response = await fastify.inject({
              method: 'GET',
              url: `${prefix}/${doc._id}`,
            })

            t.test('should return 200', t => {
              t.strictSame(response.statusCode, 200, response.payload)
              t.end()
            })

            t.test('should have null name', async t => {
              const result = JSON.parse(response.payload)
              t.equal(result.name, null)
              t.end()
            })

            if (index === 0) {
              t.test(`doc ${index} should have 0.0 price`, async t => {
                const result = JSON.parse(response.payload)
                t.equal(result.price, 0.0)
                t.end()
              })
            } else {
              t.test(`doc ${index} should have not null price`, async t => {
                const result = JSON.parse(response.payload)
                t.not(result.price, null)
                t.end()
              })
            }
          })
        })

        t.end()
      })

      t.test('on database', async t => {
        const body = JSON.parse(response.payload)

        const doc1 = await collection.findOne({ _id: new ObjectId(body[0]._id) })
        const doc2 = await collection.findOne({ _id: new ObjectId(body[1]._id) })

        const docs = [doc1, doc2]
        docs.forEach((doc, index) => {
          t.test(`doc${index}`, t => {
            const docKeys = Object.keys(DOCS[index])

            docKeys.forEach(k => {
              t.test(`should have ${k}`, t => {
                if (k === 'position') {
                  t.strictSame(doc[k], { type: 'Point', coordinates: DOCS[index][k] })
                } else if (k === 'price' && index === 0) {
                  t.equal(doc[k], 0.0)
                } else {
                  t.strictSame(doc[k], DOCS[index][k])
                }
                t.end()
              })
            })

            t.test('should have creatorId', t => {
              t.strictSame(doc.creatorId, newUpdaterId)
              t.end()
            })
            t.test('should have updaterId', t => {
              t.strictSame(doc.updaterId, newUpdaterId)
              t.end()
            })
            t.test('should have createdAt', t => {
              t.ok(Date.now() - doc.createdAt < 5000, '`createdAt` should be set')
              t.end()
            })
            t.test('should have updatedAt', t => {
              t.ok(Date.now() - doc.updatedAt < 5000, '`updatedAt` should be set')
              t.end()
            })
            t.test('should have __STATE__ in PUBLIC', t => {
              t.strictSame(doc[__STATE__], STATES.PUBLIC)
              t.end()
            })

            t.end()
          })
        })
      })
    })
  })

  t.test('PUBLIC as defaultState', async t => {
    const DOCS = [
      {
        name: 'foo',
        price: 33.33,
        position: [4.1, 4.3, 2.1],
        additionalInfo: {
          footnotePages: [2, 3, 5, 23, 3],
          notes: {
            mynote: 'good',
          },
        },
      },
    ]

    t.test('ok', async t => {
      await resetCollection()

      const prefix = '/cars-endpoint'

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/bulk`,
        payload: DOCS,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return application/json', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the inserted ids', t => {
        const body = JSON.parse(response.payload)
        t.strictSame(body.length, DOCS.length)
        body.forEach(el => t.ok(el._id))
        t.end()
      })

      t.test('GET /<id>', t => {
        const body = JSON.parse(response.payload)

        body.forEach((doc, index) => {
          t.test(`GET /doc${index}`, async t => {
            const response = await fastify.inject({
              method: 'GET',
              url: `${prefix}/${doc._id}`,
            })

            t.test('should return 200', t => {
              t.strictSame(response.statusCode, 200)
              t.end()
            })

            t.test('should have __STATE__ in PUBLIC', t => {
              const body = JSON.parse(response.payload)
              t.strictSame(body[__STATE__], STATES.PUBLIC)
              t.end()
            })
          })
        })

        t.end()
      })
    })
  })

  t.test('PUBLIC as defaultState, specifying DRAFT', async t => {
    const DOCS = [
      {
        name: 'foo',
        price: 33.33,
        position: [4.1, 4.3, 2.1],
        additionalInfo: {
          footnotePages: [2, 3, 5, 23, 3],
          notes: {
            mynote: 'good',
          },
        },
        __STATE__: STATES.DRAFT,
      },
    ]

    t.test('ok', async t => {
      await resetCollection()

      const prefix = '/cars-endpoint'

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/bulk`,
        payload: DOCS,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })
      t.test('should return application/json', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })
      t.test('should return the inserted ids', t => {
        const body = JSON.parse(response.payload)
        t.strictSame(body.length, DOCS.length)
        body.forEach(el => t.ok(el._id))
        t.end()
      })

      t.test('GET /<id>', t => {
        const body = JSON.parse(response.payload)

        body.forEach((doc, index) => {
          t.test(`GET /doc${index}`, async t => {
            const response = await fastify.inject({
              method: 'GET',
              url: `${prefix}/${doc._id}?_st=${STATES.DRAFT}`,
            })

            t.test('should return 200', t => {
              t.strictSame(response.statusCode, 200)
              t.end()
            })

            t.test('should have __STATE__ in DRAFT', t => {
              const body = JSON.parse(response.payload)
              t.strictSame(body[__STATE__], STATES.DRAFT)
              t.end()
            })
          })
        })

        t.end()
      })
    })
  })

  t.test('MP4-523: invalid date should return 400', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: [
        {
          name: 'New Book',
          isbn: 'new-book-isbn1',
          publishDate: 'AA2018-10-10',
        },
      ],
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.strictSame(response.statusCode, 400)
      t.end()
    })
    t.test('should return application/json', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.test('should return the inserted ids', t => {
      const body = JSON.parse(response.payload)
      t.strictSame(body, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body must match pattern "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$"',
      })
      t.end()
    })
  })
})

tap.test('MP4-462: default state ignored on /bulk when at least one document has no __STATE__', async t => {
  const DOCUMENTS = {
    'address-statistics': {
      docs: [
        {
          addressId: '111111111111111111111111',
          count: 0,
          tag: 'tag1',
          __STATE__: STATES.PUBLIC,
        },
        {
          addressId: '222222222222222222222222',
          count: 0,
          tag: 'tag2',
        },
      ],
    },
    addresses: {
      docs: [
        {
          displayName: 'name1',
          street: 'street1',
          house_number: 'hn1',
          __STATE__: STATES.PUBLIC,

        },
        {
          displayName: 'name2',
          street: 'street2',
          house_number: 'hn2',
        },
      ],
    },
    animals: {
      docs: [
        {
          name: 'fido',
          family: 'canines',
          specie: 'dog',
          weight: 15,
          __STATE__: STATES.PUBLIC,
        },
        {
          name: 'fiocco',
          family: 'felines',
          specie: 'cat',
          weight: 5,
        },
      ],
    },
    books: {
      docs: [{
        name: 'book1',
        isbn: 'isbn000000',
        price: 100,
        __STATE__: STATES.PUBLIC,
      },
      {
        name: 'book2',
        isbn: 'isbn11111111',
        price: 100,
      }],
    },
    'books-encrypted': {
      docs: [{
        name: 'book1',
        isbn: 'isbn000000',
        price: 100,
        __STATE__: STATES.PUBLIC,
      },
      {
        name: 'book2',
        isbn: 'isbn11111111',
        price: 100,
      }],
    },
    cars: {
      docs: [
        {
          name: 'docWithState',
          price: 33.33,
          position: [4.1, 4.3, 2.1],
          additionalInfo: {
            footnotePages: [2, 3, 5, 23, 3],
            notes: {
              mynote: 'good',
            },
          },
          __STATE__: STATES.TRASH,
        },
        {
          name: 'docWithoutState',
          price: 33.33,
          position: [4.1, 4.3, 2.1],
          additionalInfo: {
            footnotePages: [2, 3, 5, 23, 3],
            notes: {
              mynote: 'good',
            },
          },
        },
      ],
    },
    films: {
      docs: [{
        title: 'film1',
        episode_id: 1,
        __STATE__: STATES.PUBLIC,
      },
      {
        title: 'film2',
        episode_id: 2,
      }],
    },
    people: {
      docs: [
        {
          name: 'people1',
          height: 10,
          films: [
            'aaaaaaaaaaaaaaaaaaaaaaaa',
          ],
          __STATE__: STATES.PUBLIC,
        },
        {
          name: 'people2',
          height: 20,
          films: [
            'bbbbbbbbbbbbbbbbbbbbbbbb',
          ],
        },
      ],
    },
    stations: {
      docs: [
        {
          Cap: 11111,
          CodiceMIR: 'S11111',
          Comune: 'Comune1',
          Direttrici: [
            'D111',
          ],
          Indirizzo: 'Indirizzo1',
          country: 'it',
          __STATE__: STATES.PUBLIC,
        },
        {
          Cap: 22222,
          CodiceMIR: 'S22222',
          Comune: 'Comune2',
          Direttrici: [
            'D222',
          ],
          Indirizzo: 'Indirizzo2',
          country: 'it',
        },
      ],
    },
    projects: {
      docs: [{
        name: 'Project 1',
        environments: [],
        __STATE__: STATES.PUBLIC,
      }, {
        name: 'Project 2',
        environments: [],
      }],
    },
  }

  const collections = readdirSync(path.join(__dirname, 'collectionDefinitions'))

  const collectionsToSkip = ['felines.js', 'canines.js', 'store.js', 'store-open.js']

  const filteredCollections = collections.filter(collection => !collectionsToSkip.includes(collection))

  t.test('Verify all collections', async t => {
    t.plan(filteredCollections.length)
    filteredCollections.forEach(collection => {
      t.test(`${collection}`, async t => {
        // eslint-disable-next-line global-require
        const { name, defaultState, endpointBasePath } = require(`./collectionDefinitions/${collection}`)
        const { fastify } = await setUpTest(t, null, name)
        const { docs } = DOCUMENTS[name]
        const [firstDocument, secondDocument] = docs

        t.plan(docs.length + 2)

        t.ok(firstDocument.__STATE__)
        t.ok(!secondDocument.__STATE__)

        const expected = [
          firstDocument,
          {
            ...secondDocument,
            __STATE__: defaultState,
          },
        ]

        const bulkResponse = await fastify.inject({
          method: 'POST',
          url: `${endpointBasePath}/bulk`,
          payload: docs,
          headers: {
            userId: newUpdaterId,
          },
        })

        const documentsIds = JSON.parse(bulkResponse.payload)
        documentsIds.forEach((doc, index) => {
          t.test(`Expect document ${index} to have STATE: ${expected[index][__STATE__]} - DEFAULT STATE IS ${defaultState}`, async t => {
            const { _id } = doc

            const getResponse = await fastify.inject({
              method: 'GET',
              url: `${endpointBasePath}/${_id}?_st=PUBLIC,DRAFT,TRASH,DELETED`,
            })
            const { __STATE__ } = JSON.parse(getResponse.payload)
            t.equal(__STATE__, expected[index].__STATE__)
          })
        })
      })
    })
  })
})
