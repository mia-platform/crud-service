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
  name: 'orders',
  endpointBasePath: '/orders-endpoint',
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
      name: 'id_rider',
      type: 'ObjectId',
      description: 'The id of the rider who will deliver the items',
      required: true,
      nullable: false,
    },
    {
      name: 'items',
      type: 'Array',
      items: {
        type: 'string',
      },
      description: 'The id of items to deliver to the customer',
      required: true,
      nullable: false,
    },
    {
      name: 'paid',
      type: 'boolean',
      description: 'Whether the order has been payed',
      required: false,
      nullable: true,
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
  ],
}
