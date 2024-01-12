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
  name: 'customers',
  endpointBasePath: '/customers',
  defaultState: 'PUBLIC',
  fields: [
    {
      name: '_id',
      type: 'ObjectId',
      required: true,
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
    {
      name: 'customerId',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'firstName',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'lastName',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'gender',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'birthDate',
      type: 'Date',
      required: true,
      nullable: false,
    },
    {
      name: 'creditCardDetail',
      type: 'RawObject',
      required: true,
      nullable: false,
      schema: {
        properties: {
          name: { type: 'string' },
          cardNo: { type: 'number' },
          expirationDate: { type: 'string' },
          cvv: { type: 'string' },
        },
        required: ['name', 'cardNo', 'expirationDate', 'cardCode'],
      },
    },
    {
      name: 'canBeContacted',
      type: 'boolean',
      required: false,
      nullable: false,
    },
    {
      name: 'email',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'phoneNumber',
      type: 'string',
      required: false,
      nullable: false,
    },
    {
      name: 'address',
      type: 'RawObject',
      required: false,
      nullable: true,
      schema: {
        properties: {
          line: { type: 'string' },
          city: { type: 'string' },
          county: { type: 'string' },
          country: { type: 'string' },
        },
        required: ['line', 'city', 'county', 'country'],
      },
    },
    {
      name: 'socialNetworkProfiles',
      type: 'RawObject',
      required: false,
      nullable: true,
      schema: {
        properties: {
          'twitter': { type: 'string' },
          'instagram': { type: 'string' },
          'facebook': { type: 'string' },
          'threads': { type: 'string' },
          'reddit': { type: 'string' },
          'linkedin': { type: 'string' },
          'tiktok': { type: 'string' },
        },
      },
    },
    {
      name: 'subscriptionNumber',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'shopID',
      type: 'number',
      required: true,
      nullable: false,
    },
    {
      name: 'purchasesCount',
      type: 'number',
      required: true,
      nullable: false,
    },
    {
      name: 'purchases',
      type: 'Array',
      items: {
        type: 'RawObject',
        schema: {
          properties: {
            name: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            employeeId: { type: 'string' },
            boughtOnline: { type: 'boolean' },
          },
        },
      },
    },
    {
      name: 'details',
      type: 'string',
      required: false,
      nullable: false,
    },
  ],
  indexes: [
    {
      name: '_id',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: '_id',
          order: 1,
        },
      ],
    },
    {
      name: 'createdAt',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'createdAt',
          order: -1,
        },
      ],
    },
    {
      name: 'exportIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'shopID',
          order: 1,
        },
        {
          name: '__STATE__',
          order: 1,
        },
      ],
    },
    {
      name: 'customerId',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'customerId',
          order: 1,
        },
      ],
    },
  ],
}
