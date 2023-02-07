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
  id: 'projects',
  description: 'Collection of projects',
  name: 'projects',
  fields: [
    {
      name: '_id',
      description: '_id',
      type: 'ObjectId',
      required: true,
      nullable: false,
    },
    {
      name: 'creatorId',
      description: 'creatorId',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'createdAt',
      description: 'createdAt',
      type: 'Date',
      required: true,
      nullable: false,
    },
    {
      name: 'updaterId',
      description: 'updaterId',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'updatedAt',
      description: 'updatedAt',
      type: 'Date',
      required: true,
      nullable: false,
    },
    {
      name: '__STATE__',
      description: '__STATE__',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'name',
      description: 'The name of the project',
      type: 'string',
      required: true,
      nullable: false,
    },
    {
      name: 'environments',
      type: 'Array',
      required: false,
      nullable: false,
      items: {
        type: 'RawObject',
        schema: {
          properties: {
            label: {
              type: 'string',
            },
            value: {
              type: 'string',
            },
            envId: {
              type: 'string',
            },
            dashboards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                  },
                  label: {
                    type: 'string',
                  },
                  id: {
                    type: 'string',
                  },
                },
                additionalProperties: true,
              },
            },
          },
          additionalProperties: true,
        },
      },
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
  endpointBasePath: '/projects',
  defaultState: 'PUBLIC',
}
