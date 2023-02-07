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
  id: 'stations',
  description: 'Collection of stations',
  name: 'stations',
  fields: [
    {
      name: '_id',
      description: '_id',
      type: 'string',
      required: true,
      crypted: false,
      nullable: false,
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
      name: 'Cap',
      type: 'number',
      required: false,
      crypted: false,
      nullable: true,
    },
    {
      name: 'CodiceMIR',
      type: 'string',
      required: false,
      crypted: false,
      nullable: true,
    },
    {
      name: 'Comune',
      type: 'string',
      required: false,
      crypted: false,
      nullable: true,
    },
    {
      name: 'Direttrici',
      type: 'Array',
      required: false,
      crypted: false,
      nullable: true,
      items: {
        type: 'string',
      },
    },
    {
      name: 'Indirizzo',
      type: 'string',
      required: false,
      crypted: false,
      nullable: true,
    },
    {
      name: 'country',
      type: 'string',
      required: false,
      crypted: false,
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
  ],
  endpointBasePath: '/stations-endpoint',
  defaultState: 'DRAFT',
}
