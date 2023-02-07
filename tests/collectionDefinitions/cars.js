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

module.exports = {
  name: 'cars',
  endpointBasePath: '/cars-endpoint',
  defaultState: 'PUBLIC',
  fields: [
    {
      name: '_id',
      type: 'ObjectId',
      required: true,
    },
    {
      name: 'name',
      type: 'string',
      description: 'The car\'s name',
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      description: 'The car\'s price',
      required: false,
    },
    {
      name: 'position',
      type: 'GeoPoint',
      description: 'The car\'s position',
      required: false,
    },
    {
      name: 'additionalInfo',
      type: 'RawObject',
      required: false,
    },
    {
      name: 'updaterId',
      type: 'string',
      description: 'User id that has requested the last change successfully',
      required: true,
    },
    {
      name: 'updatedAt',
      type: 'Date',
      description: 'Date of the request that has performed the last change',
      required: true,
    },
    {
      name: 'creatorId',
      type: 'string',
      description: 'User id that has created this object',
      required: true,
    },
    {
      name: 'createdAt',
      type: 'Date',
      description: 'Date of the request that has performed the object creation',
      required: true,
    },
    {
      name: '__STATE__',
      type: 'string',
      description: 'The state of the document',
      required: true,
    },
  ],
  indexes: [
    {
      name: 'nameUnique',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'name',
          order: 1,
        },
      ],
    },
    {
      name: 'priceIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'price',
          order: 1,
        },
      ],
    },
    {
      name: 'positionIndex',
      type: 'geo',
      unique: false,
      field: 'position',
    },
    {
      name: 'ttlIndex',
      type: 'normal',
      expireAfterSeconds: 100,
      unique: false,
      fields: [
        {
          name: 'createdAt',
          order: 1,
        },
      ],
    },
  ],
}
