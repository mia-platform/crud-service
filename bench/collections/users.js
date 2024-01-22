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
  name: 'users',
  endpointBasePath: '/users',
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
      name: 'email',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'bio',
      type: 'string',
      required: false,
      nullable: false,
    },
    {
      name: 'birthDate',
      type: 'Date',
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
      name: 'subscriptionNumber',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'purchases',
      type: 'number',
      required: false,
      nullable: false,
    },
    {
      name: 'happy',
      type: 'boolean',
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
      name: 'email',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'email',
          order: 1,
        },
      ],
    },
  ],
}