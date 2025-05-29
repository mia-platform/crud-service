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

const BadRequestError = require('../lib/BadRequestError')
const { rawProjectionDictionary } = require('../lib/consts')
const { isEmpty } = require('lodash')

/** This function tries to extract the content of `$project` MongoDB stage
 *  to be employed in the find operator
 *
 * @param {string|undefined} clientProjection a string representing a list of comma separated field names
 * @param {string|undefined} aclColumns a string representing a list of comma separated field
 *                                      names that are allowed to be visualized by current user
 * @param {Array.<string>|undefined} allFieldNames a list of fields names associated to this collection
 * @param {string|undefined} rawProjection a string representing an object that can be employed to
 *                                         manipulate which or how fields should be returned
 * @param {Logger} log a logger instance
 * @returns {Object.<string, number|string|Object>} an object representing a projection filter for MongoDB
 */
function resolveProjection(
  clientProjection,
  aclColumns,
  allFieldNames,
  rawProjection,
  log
) {
  log.debug('resolving projections')
  const acls = intoArray(aclColumns)

  if (clientProjection && rawProjection) {
    log.error(
      { _p: clientProjection, _rawp: rawProjection },
      'use of both _p and _rawp is not permitted'
    )

    throw new BadRequestError('Use of both _rawp and _p parameter is not allowed')
  }

  let projection
  if (!clientProjection && !rawProjection) {
    projection = removeAclColumns(allFieldNames, acls)
  } else if (rawProjection) {
    projection = resolveRawProjectionString(rawProjection, acls, allFieldNames, log)
  } else if (clientProjection) {
    projection = removeAclColumns(intoArray(clientProjection), acls)
  }

  return getProjection(projection)
}

function resolveRawProjectionString(rawProjection, acls, allFieldNames, log) {
  try {
    checkAllowedOperators(rawProjection, rawProjectionDictionary, acls.length > 0 ? acls : allFieldNames, log)

    const rawProjectionObject = resolveRawProjection(rawProjection)
    const projection = removeAclColumnsFromRawProjection(rawProjectionObject, acls)

    return !isEmpty(projection) ? [projection] : []
  } catch (errorMessage) {
    log.error(errorMessage.message)
    throw new BadRequestError(errorMessage.message)
  }
}


function getProjection(projection) {
  // In case of empty projection, we project only the _id
  if (!projection?.length) {
    return { _id: 1 }
  }

  return projection.reduce(
    (acc, val) => {
      const propertiesToInclude = typeof val === 'string'
        // a string represents the name of a field to be projected
        ? { [val]: 1 }
        // an object represents a raw projection to be passed as it is
        : val

      return { ...acc, ...propertiesToInclude }
    },
    {}
  )
}

/** Take a string containing comma-separated values
 *  and split it into a list of its components, removing blank elements.
 *
 * @param {string} value
 * @returns {Array.<string>}
 */
function intoArray(value) {
  return value ? value.split(',').filter(elem => elem.trim().length > 0) : []
}

function resolveRawProjection(clientRawProjectionString) {
  return clientRawProjectionString ? JSON.parse(clientRawProjectionString) : {}
}

function removeAclColumns(fieldsInProjection, aclColumns) {
  return aclColumns.length > 0 ? fieldsInProjection.filter(field => aclColumns.includes(field)) : fieldsInProjection
}

const isVoid = (value) => value === undefined || value === null

function removeAclColumnsFromRawProjection(rawProjectionObject, aclColumns) {
  if (checkIfRawProjectionOverridesAcls(rawProjectionObject, aclColumns)) {
    throw Error('_rawp exclusive projection is overriding at least one acl_read_column value')
  }

  const rawProjectionFields = Object.keys(rawProjectionObject)
  const filteredFields = removeAclColumns(rawProjectionFields, aclColumns)

  return filteredFields.reduce(
    (acc, current) => {
      if (!isVoid(rawProjectionObject[current])) {
        acc[current] = rawProjectionObject[current]
      }

      return acc
    },
    {}
  )
}

// to match camelCase operators, snake mongo_systems variables and field variables
const fieldVarOrOperatorsRegex = /\${1,2}[a-zA-Z_0-9-]+/g

function checkAllowedOperators(rawProjection, projectionDictionary, additionalFields, log) {
  if (!rawProjection) {
    log.debug('no raw projection found: checkAllowedOperators returns true')
    return true
  }

  const { allowedOperators, notAllowedOperators } = projectionDictionary
  const allowedFields = [...allowedOperators]

  additionalFields.forEach(field => allowedFields.push(`$${field}`))

  log.trace({ allowedOperators: allowedFields }, 'allowed operators for projection')
  log.trace({ notAllowedOperators }, 'not allowed operators for projection')

  const matches = rawProjection.match(fieldVarOrOperatorsRegex)

  if (!matches) {
    log.debug('No operators found in raw projection: checkAllowedOperators returns true')
    return true
  }

  return !matches.some(match => {
    if (match.startsWith('$$')) {
      log.debug({ match }, 'Found $$ match in raw projection')
      if (notAllowedOperators.includes(match)) {
        throw Error(`Operator ${match} is not allowed in raw projection`)
      }

      return notAllowedOperators.includes(match)
    }

    if (!allowedFields.includes(match)) {
      throw Error(`Operator ${match} is not allowed in raw projection`)
    }

    return !allowedFields.includes(match)
  })
}

function checkIfRawProjectionOverridesAcls(rawProjection, acls) {
  return Object.keys(rawProjection).some(field => acls.includes(field) && rawProjection[field] === 0)
}

module.exports = {
  resolveProjection,
}
