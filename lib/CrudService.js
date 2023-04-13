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

const assert = require('assert')

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
  STATES: { PUBLIC, DRAFT, TRASH, DELETED },
  textScore,
  SETCMD,
  UNSETCMD,
  INCCMD,
  MULCMD,
  CURDATECMD,
  SETONINSERTCMD,
  PUSHCMD,
  ADDTOSETCMD,
  PULLCMD,
} = require('./consts')

const ALLOWED_COMMANDS = [
  SETCMD,
  INCCMD,
  MULCMD,
  CURDATECMD,
  SETONINSERTCMD,
  UNSETCMD,
  PUSHCMD,
  PULLCMD,
  ADDTOSETCMD,
]

const STANDARD_FIELDS = [
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
]

/**
 * List of states available for a document managed by the CRUD Service
 * and the possible states it could move to based on requested operations
 */
const STATES_FINITE_STATE_MACHINE = {
  [PUBLIC]: [DRAFT],
  [DRAFT]: [PUBLIC, TRASH],
  [TRASH]: [PUBLIC, DRAFT, DELETED],
  [DELETED]: [TRASH],
}

const NO_DOCUMENT_FOUND = '<no document found>'

function getQueryOptions(crudServiceOptions) {
  const options = {}
  if (crudServiceOptions.allowDiskUse !== undefined) {
    options.allowDiskUse = crudServiceOptions.allowDiskUse
  }
  return options
}

class CrudService {
  constructor(mongoCollection, stateOnInsert, options = {}) {
    assert(STATES_FINITE_STATE_MACHINE[stateOnInsert], 'Invalid `stateOnInsert`')
    this._mongoCollection = mongoCollection
    this._stateOnInsert = stateOnInsert
    this._options = options
  }

  findAll(context, query, projection, sort, skip, limit, _states, isTextSearchQuery) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0
    const mongoProjection = getProjection(projection)

    let sortConfig = sort
    if (isTextSearchQuery) {
      addTextScoreProjection(mongoProjection)
      if (!sortConfig) {
        sortConfig = { score: textScore }
      }
    }

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, projection, sort: sortConfig, skip, limit, options }, 'findAll operation requested')

    let cursor = this._mongoCollection
      .find(searchQuery, options)
      .project(mongoProjection)

    if (sortConfig !== undefined && sortConfig !== null) { cursor = cursor.sort(sortConfig) }
    if (skip !== undefined && skip !== null) { cursor = cursor.skip(skip) }
    if (limit !== undefined && limit !== null) { cursor = cursor.limit(limit) }
    return cursor
  }

  findById(context, id, query, projection, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }
    const mongoProjection = getProjection(projection)
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, projection, options }, 'findById operation requested')

    return this._mongoCollection.findOne(searchQuery, {
      projection: mongoProjection, ...options,
    })
  }

  async insertOne(context, doc) {
    context.log.debug({ doc }, 'insertOne operation requested')
    assertDocHasNotStandardField(doc)

    doc[CREATORID] = context.userId
    doc[UPDATERID] = context.userId
    doc[UPDATEDAT] = context.now
    doc[CREATEDAT] = context.now
    doc[__STATE__] = doc[__STATE__] || this._stateOnInsert


    const writeOpResult = await this._mongoCollection.insertOne(doc)

    context.log.debug({ docId: writeOpResult.insertedId }, 'insertOne operation executed')
    return {
      _id: writeOpResult.insertedId,
      ...doc,
    }
  }

  async insertOneWithId(context, id, doc) {
    context.log.debug({ doc }, 'insertOneWithId operation requested')
    assert.ok(!doc._id, 'doc._id already exists')
    assertDocHasNotStandardField(doc)

    doc._id = id
    doc[CREATORID] = context.userId
    doc[UPDATERID] = context.userId
    doc[UPDATEDAT] = context.now
    doc[CREATEDAT] = context.now
    doc[__STATE__] = doc[__STATE__] || this._stateOnInsert

    await this._mongoCollection.insertOne(doc)

    context.log.debug({ docId: id }, 'insertOneWithId operation executed')
    return doc
  }

  async insertMany(context, docs) {
    context.log.debug({ docs }, 'insertMany operation requested')
    assert(docs.length > 0, 'At least one element is required')

    for (const doc of docs) {
      assertDocHasNotStandardField(doc)
      doc[CREATORID] = context.userId
      doc[UPDATERID] = context.userId
      doc[UPDATEDAT] = context.now
      doc[CREATEDAT] = context.now
      doc[__STATE__] = doc[__STATE__] || this._stateOnInsert
    }

    const writeOpResult = await this._mongoCollection.insertMany(docs)

    const indexKeys = Object.keys(writeOpResult.insertedIds)
    const resultDocs = new Array(indexKeys.length)
    for (const indexKey of indexKeys) {
      resultDocs[indexKey] = {
        _id: writeOpResult.insertedIds[indexKey],
        ...docs[indexKey],
      }
    }

    context.log.debug({ docIds: writeOpResult.insertedIds }, 'insertMany operation executed')
    return resultDocs
  }

  async deleteById(context, id, query, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }

    context.log.debug({ query: searchQuery }, 'deleteById operation requested')

    const writeOpResult = await this._mongoCollection.findOneAndDelete(searchQuery)

    context.log.debug({ docId: writeOpResult.value?._id || NO_DOCUMENT_FOUND }, 'deleteById operation executed')
    return writeOpResult.value
  }

  async patchById(context, id, commands, query, projection, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }

    context.log.debug({ query: searchQuery, commands, projection }, 'patchById operation requested')
    assertCommands(commands)

    commands.$set = commands.$set || {}
    commands.$set[UPDATERID] = context.userId
    commands.$set[UPDATEDAT] = context.now

    const mongoProjection = getProjection(projection)


    const writeOpResult = await this._mongoCollection.findOneAndUpdate(
      searchQuery,
      commands,
      {
        returnDocument: 'after',
        projection: mongoProjection,
      }
    )

    context.log.debug({ docId: writeOpResult.value?._id || NO_DOCUMENT_FOUND }, 'patchById operation executed')
    return writeOpResult.value
  }

  async patchMany(context, commands, query, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery

    context.log.debug({ query: searchQuery, commands }, 'patchMany operation requested')
    assertCommands(commands)

    commands.$set = commands.$set || {}
    commands.$set[UPDATERID] = context.userId
    commands.$set[UPDATEDAT] = context.now


    const { matchedCount, modifiedCount } = await this._mongoCollection.updateMany(searchQuery, commands)

    context.log.debug({ matchedCount, modifiedCount }, 'patchMany operation executed')
    return modifiedCount
  }

  async upsertOne(context, commands, query, projection, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery

    context.log.debug({ query: searchQuery, commands, projection }, 'upsertOne operation requested')
    assertCommands(commands)

    commands.$set = commands.$set || {}
    commands.$set[UPDATERID] = context.userId
    commands.$set[UPDATEDAT] = context.now

    commands.$setOnInsert = commands.$setOnInsert || {}
    commands.$setOnInsert[CREATORID] = context.userId
    commands.$setOnInsert[CREATEDAT] = context.now
    commands.$setOnInsert[__STATE__] = this._stateOnInsert

    const mongoProjection = getProjection(projection)

    const writeOpResult = await this._mongoCollection.findOneAndUpdate(
      searchQuery,
      commands,
      {
        returnDocument: 'after',
        upsert: true,
        projection: mongoProjection,
      }
    )

    context.log.debug({ docId: writeOpResult.value._id }, 'upsertOne operation executed')
    return writeOpResult.value
  }

  async patchBulk(context, filterUpdateCommands) {
    context.log.debug(filterUpdateCommands, 'patchBulk operation requested')
    assert(filterUpdateCommands.length > 0, 'At least one element is required')

    const unorderedBulkOp = this._mongoCollection.initializeUnorderedBulkOp()
    for (let i = 0; i < filterUpdateCommands.length; i++) {
      const { _id, commands, query, state: allowedStates } = filterUpdateCommands[i]
      const stateQuery = { [__STATE__]: { $in: allowedStates } }
      const isQueryValid = query && Object.keys(query).length > 0

      const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : { $and: [stateQuery] }

      if (_id) {
        searchQuery.$and.push({ _id })
      }

      assertCommands(commands)

      commands.$set = commands.$set || {}
      commands.$set.updaterId = context.userId
      commands.$set.updatedAt = context.now
      unorderedBulkOp.find(searchQuery).updateOne(commands)
    }

    const { ok, nModified } = await unorderedBulkOp.execute()
    if (!ok) { throw new Error('patchBulk failed') }

    context.log.debug({ ok, nModified }, 'patchBulk operation executed')
    return nModified
  }

  async count(context, query, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, options }, 'count operation requested')

    return this._mongoCollection.countDocuments(searchQuery, options)
  }

  async deleteAll(context, query, _states) {
    const allowedStates = _states || [PUBLIC]
    const stateQuery = { [__STATE__]: { $in: allowedStates } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery

    context.log.debug({ query: searchQuery }, 'deleteAll operation requested')

    const writeOpResult = await this._mongoCollection.deleteMany(searchQuery)

    context.log.debug({ docNumber: writeOpResult.deletedCount }, 'deleteAll operation executed')
    return writeOpResult.deletedCount
  }

  async changeStateById(context, id, stateTo, query) {
    context.log.debug({ query, stateTo }, 'changeStateById operation requested')
    const currentState = STATES_FINITE_STATE_MACHINE[stateTo]
    assert(currentState, `Invalid current \`stateTo\` parameter: ${stateTo}`)

    const stateQuery = { [__STATE__]: { $in: currentState } }
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }

    const commands = {
      $set: {
        [__STATE__]: stateTo,
        [UPDATERID]: context.userId,
        [UPDATEDAT]: context.now,
      },
    }

    const writeOpResult = await this._mongoCollection.findOneAndUpdate(
      searchQuery,
      commands,
      { returnDocument: 'after' }
    )

    context.log.debug({ docId: writeOpResult.value?._id || NO_DOCUMENT_FOUND }, 'changeStateById operation executed')
    return writeOpResult.value
  }

  async changeStateMany(context, filterUpdateCommands) {
    context.log.debug({ filterUpdateCommands }, 'changeStateMany operation requested')
    assert(filterUpdateCommands.length > 0, 'At least one element is required')

    const unorderedBulkOp = this._mongoCollection.initializeUnorderedBulkOp()
    for (let i = 0; i < filterUpdateCommands.length; i++) {
      const { query, stateTo } = filterUpdateCommands[i]

      const currentState = STATES_FINITE_STATE_MACHINE[stateTo]
      assert(currentState, `Invalid current \`stateTo\` parameter: ${stateTo}`)

      const stateQuery = { [__STATE__]: { $in: currentState } }
      const isQueryValid = query && Object.keys(query).length > 0

      const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery

      const commands = {
        $set: {
          __STATE__: stateTo,
          updaterId: context.userId,
          updatedAt: context.now,
        },
      }

      context.log.debug({ query: searchQuery, commands }, `changeStateMany - step #${i + 1} executed`)
      unorderedBulkOp.find(searchQuery).update(commands)
    }

    const res = await unorderedBulkOp.execute()
    const { ok, nModified } = res
    if (!ok) { throw new Error('changeStateMany failed') }

    context.log.debug({ ok, nModified }, 'changeStateMany operation executed')
    return nModified
  }
}

function getProjection(projection) {
  // In case of empty projection, we project only the _id
  if (!projection?.length) { return { _id: 1 } }

  return projection.reduce((acc, val) => {
    const propertiesToInclude = typeof val === 'string'
      // a string represents the name of a field to be projected
      ? { [val]: 1 }
      // an object represents a raw projection to be passed as it is
      : val

    return { ...acc, ...propertiesToInclude }
  }, {})
}

function addTextScoreProjection(projection) {
  if (!Object.keys(projection).includes('score')) {
    projection.score = textScore
  }
}

function assertDocHasNotStandardField(doc) {
  STANDARD_FIELDS.forEach(field => {
    assert.ok(!doc[field], `${field} cannot be specified`)
  })
}

function assertCommands(command) {
  if (command.$set) {
    assertDocHasNotStandardField(command.$set)
  }
  if (command.$inc) {
    assertDocHasNotStandardField(command.$inc)
  }
  if (command.$mul) {
    assertDocHasNotStandardField(command.$mul)
  }
  if (command.$currentDate) {
    assertDocHasNotStandardField(command.$currentDate)
  }
  if (command.$setOnInsert) {
    assertDocHasNotStandardField(command.$setOnInsert)
  }
  if (command.$unset) {
    assertDocHasNotStandardField(command.$unset)
  }
  if (command.$push) {
    assertDocHasNotStandardField(command.$push)
  }
  if (command.$addToSet) {
    assertDocHasNotStandardField(command.$addToSet)
  }
  if (command.$pull) {
    assertDocHasNotStandardField(command.$pull)
  }
  for (const key of Object.keys(command)) {
    if (!ALLOWED_COMMANDS.includes(key)) {
      assert.fail(`Unknown operator: ${key}`)
    }
  }
}

CrudService.STANDARD_FIELDS = STANDARD_FIELDS

module.exports = CrudService
