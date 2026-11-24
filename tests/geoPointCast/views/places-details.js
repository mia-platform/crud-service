/*
 * Copyright 2026 Mia s.r.l.
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
  name: 'places-details',
  source: 'places',
  type: 'view',
  enableLookup: true,
  pipeline: [
    {
      $lookup: {
        from: 'owners',
        localField: 'id_owner',
        foreignField: '_id',
        as: 'owner',
        pipeline: [{ $project: { _id: 0, value: { $toObjectId: '$_id' }, label: { $toString: '$name' } } }],
      },
    },
    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        updaterId: 1,
        updatedAt: 1,
        creatorId: 1,
        createdAt: 1,
        __STATE__: 1,
        name: 1,
        position: 1,
        info: 1,
        owner: 1,
      },
    },
  ],
}
