/* eslint-disable no-param-reassign */
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

const through2 = require('through2')
const { fieldsToSchema } = require('./ResultCaster.utils')
const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')
const lset = require('lodash.set')
const { MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__ } = require('./consts')
const mandatoryFields = [MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__]
const fs = require('fs')
const { JSONPath } = require('jsonpath-plus')
const ajvKeyword = require('ajv-keywords')
const { unset } = require('lodash')


class ResultCaster {
  constructor(collectionDefinition) {
    const ajv = new Ajv({ coerceTypes: true, useDefaults: true, removeAdditional: true })
    ajv.addKeyword({
      keyword: '__mia_configuration',
      schemaType: 'object',
      modifying: true,
      compile: (schema) => {
        switch (schema.type) {
        case 'GeoPoint':
          return (data, parentSchema) => {
            data = lset(parentSchema.rootData, parentSchema.instancePath.replace('/', ''), data.coordinates)
            return true
          }
        case 'ObjectId':
          return (data, parentSchema) => {
            data = lset(parentSchema.rootData, parentSchema.instancePath.replace('/', ''), data.toString())
            return true
          }
        default:
          break
        }

        return () => true
      },
    })
    ajvFormats(ajv)
    ajvKeyword(ajv, 'instanceof')

    const schema = collectionDefinition.schema ?? fieldsToSchema(collectionDefinition.fields)
    delete schema.required

    const isObjectId = '@.__mia_configuration?.type=="ObjectId"'
    const isGeoPoint = '@.__mia_configuration?.type=="GeoPoint"'

    const pathsToBeRemoved = JSONPath({
      path: `$..[?(${isObjectId} || ${isGeoPoint})]`,
      json: schema,
      resultType: 'pointer',
    })
      .map(path => path
        .split('/')
        .filter(str => str.length > 0)
        .join('.')
      )
    Array.from(...mandatoryFields, ...pathsToBeRemoved).forEach(field => unset(schema, field))


    // Object.keys(schema.properties).forEach(field => {
    //   if (mandatoryFields.has(field)) {
    //     delete schema.properties[field]
    //   }

    //   if (schema.properties[field].type === 'string' && DATE_FORMATS.includes(schema.properties[field].format)) {
    //     schema.properties[field] = {
    //       type: 'object',
    //       instanceof: 'Date',
    //     }
    //   }
    // })
    this._validate = ajv.compile(schema)
    fs.writeFile(`${collectionDefinition.name}-schema.log`, JSON.stringify(schema, null, 2), error => error)
  }

  asStream() {
    return through2.obj((chunk, _, callback) => {
      this.castItem(chunk)
      callback(null, chunk)
    })
  }

  castItem(item) {
    this._validate(item)
  }
}

module.exports = ResultCaster
