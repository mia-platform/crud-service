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
  name: 'registered-customers',
  endpointBasePath: '/registered-customers',
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
      name: 'shopID',
      type: 'number',
      required: true,
      nullable: false,
    },
    {
      name: 'canBeContacted',
      type: 'boolean',
      required: false,
      nullable: false,
    },
    {
      name: 'purchasesCount',
      type: 'number',
      required: true,
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
      name: 'shopIdIndex',
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
      name: 'purchasesCountIndex',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'purchasesCount',
          order: 1,
        },
      ],
    },
    {
      name: 'canBeContactedIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'canBeContacted',
          order: 1,
        },
      ],
    },
  ],
}
