'use strict'

const BadRequestError = require('./BadRequestError')

/**
 * This function resolves a mongodb query that has to be performed over a CRUD resource.
 *
 * @param {import('./QueryParser')} queryParser the QueryParser istance
 * @param {string?} clientQueryString the raw string representing a mongodb query
 * @param {unknown?} aclRows acl expression for rows filtering
 * @param {unknown?} otherParams additional parameters that will be appended to the query with $and operator
 * @param {boolean} textQuery if the query that needs to be resolved contains a text filter
 * @returns {import('mongodb').Document} mongodb query
 */
function resolveMongoQuery(
  queryParser,
  clientQueryString,
  aclRows,
  otherParams,
  textQuery
) {
  const mongoQuery = {
    $and: [],
  }

  if (clientQueryString) {
    const clientQuery = JSON.parse(clientQueryString)
    mongoQuery.$and.push(clientQuery)
  }
  if (otherParams) {
    for (const key of Object.keys(otherParams)) {
      const value = otherParams[key]
      mongoQuery.$and.push({ [key]: value })
    }
  }

  if (aclRows) {
    if (Array.isArray(aclRows)) {
      mongoQuery.$and.push({ $and: aclRows })
    } else {
      mongoQuery.$and.push(aclRows)
    }
  }

  try {
    if (textQuery) {
      queryParser.parseAndCastTextSearchQuery(mongoQuery)
    } else {
      queryParser.parseAndCast(mongoQuery)
    }
  } catch (error) {
    throw new BadRequestError(error.message)
  }

  if (!mongoQuery.$and.length) {
    return {}
  }

  return mongoQuery
}

module.exports = resolveMongoQuery
