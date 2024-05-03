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
const { get: lget, unset: lunset } = require('lodash')

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
  QUERY,
  STATE,
} = require('./consts')
const { getStateQuery } = require('./CrudService.utils')
const { JSONPath } = require('jsonpath-plus')
const { getPathFromPointer } = require('./JSONPath.utils')
const resolveMongoQuery = require('./resolveMongoQuery')


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
 * and the possible states it can start from, based on requested operations
 */
const STATES_FINITE_STATE_MACHINE = {
  [PUBLIC]: [DRAFT],
  [DRAFT]: [PUBLIC, TRASH],
  [TRASH]: [PUBLIC, DRAFT, DELETED],
  [DELETED]: [TRASH],
}

/**
 * List of status available for a document managed by the CRUD Service
 * and the possible states it can move to, based on the requested operations
 */
const ALLOWED_STATES_MAP = {
  [PUBLIC]: [DRAFT, PUBLIC, TRASH],
  [DRAFT]: [DRAFT, PUBLIC, TRASH],
  [TRASH]: [DELETED, DRAFT, TRASH],
  [DELETED]: [DELETED, TRASH],
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
  constructor(mongoCollection, stateOnInsert, defaultSorting, options = {}) {
    assert(STATES_FINITE_STATE_MACHINE[stateOnInsert], 'Invalid `stateOnInsert`')

    /**
     * @type {import('mongodb').Collection} collection used by this CRUD instance
     */
    this._mongoCollection = mongoCollection
    this._stateOnInsert = stateOnInsert
    this._defaultSorting = defaultSorting
    this._options = options
  }

  findAll(context, query, projection, sort, skip, limit, _states, isTextSearchQuery) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    if (isTextSearchQuery) {
      addTextScoreProjection(projection)
    }

    const sortConfig = getSorting({
      defaultSorting: this._defaultSorting, sort, isTextSearchQuery,
    })

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, projection, sort: sortConfig, skip, limit, options }, 'findAll operation requested')

    let cursor = this._mongoCollection
      .find(searchQuery, options)
      .project(projection)

    if (sortConfig !== undefined && sortConfig !== null) { cursor = cursor.sort(sortConfig) }
    if (skip !== undefined && skip !== null) { cursor = cursor.skip(skip) }
    if (limit !== undefined && limit !== null) { cursor = cursor.limit(limit) }
    return cursor
  }

  findById(context, id, query, projection, _states) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, projection, options }, 'findById operation requested')

    return this._mongoCollection.findOne(searchQuery, {
      projection, ...options,
    })
  }

  aggregate(context, query, projection, sort, skip, limit, _states, isTextSearchQuery) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const sortConfig = getSorting({ defaultSorting: this._defaultSorting, sort, isTextSearchQuery })
    let textSearchQuery = {}
    if (isTextSearchQuery) {
      const [path] = JSONPath({ json: query, resultType: 'pointer', path: '$..[?(@property === "$text")]' }).map(getPathFromPointer)
      textSearchQuery = { $text: lget(query, path) }
      lunset(query, path)
      addTextScoreProjection(projection)
    }

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, projection, sort: sortConfig, skip, limit, options }, 'aggregate operation requested')

    const pipeline = [
      { $match: { ...textSearchQuery, ...stateQuery } },
      { $project: projection },
      { $match: query },
    ]
    if (sortConfig !== undefined && sortConfig !== null) { pipeline.push({ $sort: sortConfig }) }
    if (skip !== undefined && skip !== null) { pipeline.push({ $skip: Number(skip) }) }
    if (limit !== undefined && limit !== null) { pipeline.push({ $limit: Number(limit) }) }

    const cursor = this._mongoCollection.aggregate(pipeline)

    return cursor
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

  /**
   * performs a insert many operation over a CRUD resource
   * @param {unknown} context context of http handler
   * @param {unknown[]} docs array of documents
   * @param {import('./QueryParser')} queryParser QueryParser instance
   * @param {{ idOnly: boolean}?} opts
   * @returns {Promise<unknown[] | import('mongodb').ObjectId[]>} if flag idOnly is set to true,
   * returns just the mongodb object ids
   */
  async insertMany(context, docs, queryParser, opts = {}) {
    const { idOnly } = opts
    context.log.debug({ docs }, 'insertMany operation requested')
    assert(docs.length > 0, 'At least one element is required')

    for (const doc of docs) {
      queryParser.parseAndCastBody(doc)
      assertDocHasNotStandardField(doc)
      doc[CREATORID] = context.userId
      doc[UPDATERID] = context.userId
      doc[UPDATEDAT] = context.now
      doc[CREATEDAT] = context.now
      doc[__STATE__] = doc[__STATE__] || this._stateOnInsert
    }

    const writeOpResult = await this._mongoCollection.insertMany(docs)
    context.log.debug({ docIds: writeOpResult.insertedIds }, 'insertMany operation executed')

    if (!idOnly) {
      for (const indexKey of Object.keys(writeOpResult.insertedIds)) {
        docs[indexKey] = {
          _id: writeOpResult.insertedIds[indexKey],
          ...docs[indexKey],
        }
      }
      return docs
    }

    return Object.values(writeOpResult.insertedIds).map((_id) => ({ _id }))
  }

  async deleteById(context, id, query, _states) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }

    context.log.debug({ query: searchQuery }, 'deleteById operation requested')

    const writeOpResult = await this._mongoCollection.findOneAndDelete(searchQuery)

    context.log.debug({ docId: writeOpResult?._id || NO_DOCUMENT_FOUND }, 'deleteById operation executed')
    return writeOpResult
  }

  async patchById(context, id, commands, query, projection, _states) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }, stateQuery] }
      : { $and: [{ _id: id }, stateQuery] }

    context.log.debug({ query: searchQuery, commands, projection }, 'patchById operation requested')
    assertCommands(commands)

    commands.$set = commands.$set || {}
    commands.$set[UPDATERID] = context.userId
    commands.$set[UPDATEDAT] = context.now

    const writeOpResult = await this._mongoCollection.findOneAndUpdate(
      searchQuery,
      commands,
      {
        returnDocument: 'after',
        projection,
      }
    )

    context.log.debug({ docId: writeOpResult?._id || NO_DOCUMENT_FOUND }, 'patchById operation executed')
    return writeOpResult
  }

  async patchMany(context, commands, query, _states) {
    const stateQuery = getStateQuery(_states)
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
    const stateQuery = getStateQuery(_states)
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

    const writeOpResult = await this._mongoCollection.findOneAndUpdate(
      searchQuery,
      commands,
      {
        returnDocument: 'after',
        upsert: true,
        projection,
      }
    )

    context.log.debug({ docId: writeOpResult._id }, 'upsertOne operation executed')
    return writeOpResult
  }

  async upsertMany(context, documents, queryParser) {
    context.log.debug(documents, 'upsertMany operation requested')
    assert(documents.length > 0, 'At least one element is required')

    const operations = []
    for (const document of documents) {
      queryParser.parseAndCastBody(document)
      assertDocHasNotStandardField(document)

      const operation = {
        updateOne: {
          filter: document._id ? { _id: document._id } : document,
          update: {
            $set: {
              ...document,
              [UPDATERID]: context.userId,
              [UPDATEDAT]: context.now,
              [__STATE__]: document[__STATE__] || this._stateOnInsert,
            },
            $setOnInsert: {
              [CREATORID]: document[CREATORID] || context.userId,
              [CREATEDAT]: document[CREATEDAT] || context.now,
            },
          },
          upsert: true,
        },
      }

      operations.push(operation)
    }

    const { ok, modifiedCount, upsertedCount } = await this._mongoCollection.bulkWrite(operations)

    if (!ok) { throw new Error('upsertMany failed') }

    context.log.debug({ ok, modifiedCount, upsertedCount }, 'upsertMany operation executed')
    return upsertedCount
  }

  /**
   * Performs a patch bulk operation over the CRUD resource
   * @param {unknown} context
   * @param {unknown[]} filterUpdateCommands list of commands that needs to be executed
   * @param {import('./QueryParser')} queryParser
   * @param {Function} castCollectionId function that casts _id field (if defined in commands)
   * @param {*} editableFields
   * @param {*} aclRows
   * @returns {Promise<number>} the number of modified documents
   */
  // eslint-disable-next-line max-statements
  async patchBulk(
    context, filterUpdateCommands, queryParser, castCollectionId, editableFields, aclRows
  ) {
    context.log.debug(filterUpdateCommands, 'patchBulk operation requested')
    assert(filterUpdateCommands.length > 0, 'At least one element is required')

    const unorderedBulkOp = this._mongoCollection.initializeUnorderedBulkOp()
    const parsedAndCastedCommands = new Array(filterUpdateCommands.length)
    for (let i = 0; i < filterUpdateCommands.length; i++) {
      const { filter, update } = filterUpdateCommands[i]
      const {
        _id,
        [QUERY]: clientQueryString,
        [STATE]: state,
        ...otherParams
      } = filter

      const commands = update

      const mongoQuery = resolveMongoQuery(queryParser, clientQueryString, aclRows, otherParams, false)
      queryParser.parseAndCastCommands(commands, editableFields)

      const allowedStates = state.split(',')

      parsedAndCastedCommands[i] = {
        commands,
        state: allowedStates,
        query: mongoQuery,
      }

      const stateQuery = getStateQuery(allowedStates)
      const isQueryValid = mongoQuery && Object.keys(mongoQuery).length > 0

      const searchQuery = isQueryValid ? { $and: [mongoQuery, stateQuery] } : { $and: [stateQuery] }

      if (_id) {
        searchQuery.$and.push({ _id: castCollectionId(_id) })
      }

      assertCommands(commands)
      commands.$set = commands.$set || {}
      commands.$set.updaterId = context.userId
      commands.$set.updatedAt = context.now
      unorderedBulkOp.find(searchQuery).updateOne(commands)
    }

    const { ok, modifiedCount } = await unorderedBulkOp.execute()
    if (!ok) { throw new Error('patchBulk failed') }

    context.log.debug({ ok, modifiedCount }, 'patchBulk operation executed')
    return modifiedCount
  }

  async count(context, query, _states) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery
    const options = getQueryOptions(this._options)

    context.log.debug({ query: searchQuery, options }, 'count operation requested')

    return this._mongoCollection.countDocuments(searchQuery, options)
  }

  async estimatedDocumentCount(context) {
    context.log.debug({}, 'estimatedDocumentCount operation requested')
    return this._mongoCollection.estimatedDocumentCount()
  }

  async deleteAll(context, query, _states) {
    const stateQuery = getStateQuery(_states)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid ? { $and: [query, stateQuery] } : stateQuery

    context.log.debug({ query: searchQuery }, 'deleteAll operation requested')

    const writeOpResult = await this._mongoCollection.deleteMany(searchQuery)

    context.log.debug({ docNumber: writeOpResult.deletedCount }, 'deleteAll operation executed')
    return writeOpResult.deletedCount
  }

  async changeStateById(context, id, stateTo, query) {
    context.log.debug({ query, stateTo }, 'changeStateById operation requested')

    assert.ok(stateTo in STATES_FINITE_STATE_MACHINE, `Invalid current \`stateTo\` parameter: ${stateTo}`)
    const isQueryValid = query && Object.keys(query).length > 0

    const searchQuery = isQueryValid
      ? { $and: [query, { _id: id }] }
      : { _id: id }


    const documentToUpdate = await this._mongoCollection.findOne(searchQuery)

    if (!documentToUpdate) {
      return null
    }

    const currentState = documentToUpdate[__STATE__]
    const allowedStates = ALLOWED_STATES_MAP[currentState]

    // this check on current state existence of allows this API
    // to assign a __STATE__ to documents that does not have the field
    // (no current state means that any transition is valid)
    if (currentState && !allowedStates.includes(stateTo)) {
      context.log.debug({ _id: documentToUpdate._id, from: currentState, to: stateTo }, 'transition from states not allowed')
      const error = new Error(`transition from ${currentState} to ${stateTo} not allowed.`)
      error.statusCode = 400
      throw error
    }

    const commands = {
      $set: {
        [__STATE__]: stateTo,
        [UPDATERID]: context.userId,
        [UPDATEDAT]: context.now,
      },
    }
    // adding current document state to the search filter of the operation ensure
    // that the state has not changed since the find operation executed above
    const { modifiedCount } = await this._mongoCollection.updateOne(
      { $and: [searchQuery, { __STATE__: currentState }] },
      commands
    )

    context.log.debug({ modifiedCount }, 'changeStateById operation executed')
    return modifiedCount
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
    const { ok, modifiedCount } = res
    if (!ok) { throw new Error('changeStateMany failed') }

    context.log.debug({ ok, modifiedCount }, 'changeStateMany operation executed')
    return modifiedCount
  }
}

function addTextScoreProjection(projection) {
  if (!Object.keys(projection).includes('score')) {
    projection.score = textScore
  }
}

function getSorting({ defaultSorting, sort, isTextSearchQuery }) {
  if (isTextSearchQuery && !sort) {
    return { score: textScore }
  }

  if (defaultSorting && !sort) {
    return defaultSorting
  }

  return sort
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
