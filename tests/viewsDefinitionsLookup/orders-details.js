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
  name: 'orders-details',
  source: 'orders',
  type: 'view',
  enableLookup: true,
  pipeline: [
    {
      $lookup: {
        from: 'riders',
        localField: 'id_rider',
        foreignField: '_id',
        as: 'rider',
        pipeline: [
          {
            $project: {
              _id: 0,
              value: {
                $toObjectId: '$_id',
              },
              label: {
                $toString: {
                  $concat: ['$name', ' ', '$surname'],
                },
              },
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$rider',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        updaterId: 1,
        updatedAt: 1,
        creatorId: 1,
        createdAt: 1,
        rider: 1,
        items: 1,

        /*
          NOTE: __STATE__ field MUST be returned in the final record produced by the pipeline
                On the contrary, records without the __STATE__ field would always be filtered out
                by the CRUD Service operations
                (e.g. listing records via GET method would not consider them in the result set)
        */
        __STATE__: 1,
      },
    },
  ],
}
