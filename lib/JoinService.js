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

const { randomBytes } = require('crypto')

const variableName = `a${randomBytes(5).toString('hex')}`

class JoinService {
  constructor(database, collections) {
    this.database = database
    this.collections = getCollections(collections)
  }

  joinOneToOne(context, joinOptions, toMerge) {
    const {
      from,
      to,
      fromQueryFilter,
      toQueryFilter,
      asField,
      localField,
      foreignField,
      fromProjectBefore,
      fromProjectAfter,
      toProjectBefore,
      toProjectAfter,
      fromACLMatching,
      toACLMatching,
    } = joinOptions
    const collection = this.database.collection(this.collections[from].name)
    const expectedLocalFieldType = this.collections[from].fields[localField]
    const innerPipeline = [
      {
        $match: {
          ...toQueryFilter,
          $expr: {
            $cond: {
              if: {
                $in: [
                  { $type: [`$$${variableName}`] },
                  expectedLocalFieldType,
                ],
              },
              then: { $eq: [`$${foreignField}`, `$$${variableName}`] },
              else: { $eq: [true, false] },
            },
          },
        },
      },
      { $limit: 1 },
    ]
    const aggregateSteps = [
      {
        $lookup: {
          from: this.collections[to].name,
          as: asField,
          let: { [variableName]: `$${localField}` },
          pipeline: innerPipeline,
        },
      },
    ]
    if (Object.keys(fromQueryFilter).length) {
      aggregateSteps.unshift({ $match: fromQueryFilter })
    }
    if (fromProjectBefore) {
      aggregateSteps.unshift({ $project: fromProjectBefore })
    }
    if (fromACLMatching) {
      aggregateSteps.unshift({ $match: { fromACLMatching } })
    }
    if (fromProjectAfter) {
      aggregateSteps.push({ $project: fromProjectAfter })
    }

    if (toProjectBefore) {
      innerPipeline.unshift({ $project: toProjectBefore })
    }
    if (toACLMatching) {
      innerPipeline.unshift({ $match: toACLMatching })
    }
    if (toProjectAfter) {
      innerPipeline.push({ $project: toProjectAfter })
    }

    if (toMerge) {
      aggregateSteps.push({
        $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: [`$${asField}`, 0] }, '$$ROOT'] } },
      })
      aggregateSteps.push({
        $project: { [asField]: 0 },
      })
    } else {
      aggregateSteps.push({
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$$ROOT',
              {
                $cond: {
                  if: {
                    $gt: [
                      { $size: [`$${asField}`] },
                      0,
                    ],
                  },
                  then: {
                    stats: {
                      $arrayElemAt: [`$${asField}`, 0],
                    },
                  },
                  else: { [asField]: null },
                },
              },
            ],
          },
        },
      })
    }

    return collection.aggregate(aggregateSteps)
  }

  joinOneToMany(context, joinOptions) {
    const {
      from,
      to,
      fromQueryFilter,
      toQueryFilter,
      asField,
      localField,
      foreignField,
      fromProjectBefore,
      fromProjectAfter,
      toProjectBefore,
      toProjectAfter,
      fromACLMatching,
      toACLMatching,
    } = joinOptions
    const collection = this.database.collection(this.collections[from].name)
    const expectedLocalFieldType = this.collections[from].fields[localField]
    const innerPipeline = [
      {
        $match: {
          ...toQueryFilter,
          $expr: {
            $cond: {
              if: {
                $in: [
                  { $type: [`$$${variableName}`] },
                  expectedLocalFieldType,
                ],
              },
              then: { $eq: [`$${foreignField}`, `$$${variableName}`] },
              else: { $eq: [true, false] },
            },
          },
        },
      },
    ]
    const aggregateSteps = [
      {
        $lookup: {
          from: this.collections[to].name,
          as: asField,
          let: { [variableName]: `$${localField}` },
          pipeline: innerPipeline,
        },
      },
    ]
    if (Object.keys(fromQueryFilter).length) {
      aggregateSteps.unshift({ $match: fromQueryFilter })
    }
    if (fromProjectBefore) {
      aggregateSteps.unshift({ $project: fromProjectBefore })
    }
    if (fromACLMatching) {
      aggregateSteps.unshift({ $match: { fromACLMatching } })
    }
    if (fromProjectAfter) {
      aggregateSteps.push({ $project: fromProjectAfter })
    }

    if (toProjectBefore) {
      innerPipeline.unshift({ $project: toProjectBefore })
    }
    if (toACLMatching) {
      innerPipeline.unshift({ $match: toACLMatching })
    }
    if (toProjectAfter) {
      innerPipeline.push({ $project: toProjectAfter })
    }

    return collection.aggregate(aggregateSteps)
  }

  joinManyToMany(context, joinOptions) {
    const {
      from,
      to,
      fromQueryFilter,
      toQueryFilter,
      asField,
      localField,
      foreignField,
      fromProjectBefore,
      fromProjectAfter,
      toProjectBefore,
      toProjectAfter,
      fromACLMatching,
      toACLMatching,
    } = joinOptions
    const collection = this.database.collection(this.collections[from].name)
    const expectedLocalFieldType = this.collections[from].fields[localField]
    const innerPipeline = [
      {
        $match: {
          ...toQueryFilter,
          $expr: {
            $cond: {
              if: {
                $in: [
                  { $type: [`$$${variableName}`] },
                  expectedLocalFieldType,
                ],
              },
              then: { $in: [`$${foreignField}`, `$$${variableName}`] },
              else: { $eq: [true, false] },
            },
          },
        },
      },
    ]
    const aggregateSteps = [
      {
        $lookup: {
          from: this.collections[to].name,
          as: asField,
          let: { [variableName]: `$${localField}` },
          pipeline: innerPipeline,
        },
      },
    ]
    if (fromQueryFilter) {
      aggregateSteps.unshift({ $match: fromQueryFilter })
    }
    if (fromProjectBefore) {
      aggregateSteps.unshift({ $project: fromProjectBefore })
    }
    if (fromACLMatching) {
      aggregateSteps.unshift({ $match: { fromACLMatching } })
    }
    if (fromProjectAfter) {
      aggregateSteps.push({ $project: fromProjectAfter })
    }

    if (toProjectBefore) {
      innerPipeline.unshift({ $project: toProjectBefore })
    }
    if (toACLMatching) {
      innerPipeline.unshift({ $match: toACLMatching })
    }
    if (toProjectAfter) {
      innerPipeline.push({ $project: toProjectAfter })
    }

    return collection.aggregate(aggregateSteps)
  }
}

function getType(type) {
  switch (type) {
  case 'string':
    return ['string']
  case 'number':
    return ['double', 'int', 'long', 'decimal']
  case 'ObjectId':
    return ['objectId']
  case 'boolean':
    return ['bool']
  case 'Date':
    return ['date']
  case 'GeoPoint':
    return ['object']
  case 'Array':
    return ['array']
  case 'RawObject':
    return ['object']
  default:
    throw new Error(`Unknown type: ${type}`)
  }
}

function getCollectionNameFromEndpoint(endpointBasePath) {
  return endpointBasePath.replace('/', '')
    .replace(/\//g, '-')
}

function getCollections(collections) {
  const ret = {}

  for (const collection of Object.values(collections)) {
    const collectionHTTPName = getCollectionNameFromEndpoint(collection.definition.endpointBasePath)
    ret[collectionHTTPName] = {
      name: collection.definition.name,
      fields: {},
    }

    for (const field of collection.definition.fields) {
      const fieldName = field.name
      ret[collectionHTTPName].fields[fieldName] = getType(field.type)
    }
  }

  return ret
}

module.exports = JoinService
