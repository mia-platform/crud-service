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

const { ObjectId } = require('mongodb')
const { STATES } = require('../../lib/consts')

module.exports = [
  {
    _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
    createdAt: new Date(2023, 3, 27, 0, 0, 0, 0),
    updatedAt: new Date(2023, 3, 27, 1, 0, 0, 0),
    creatorId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    __STATE__: STATES.PUBLIC,
    updaterId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    ingredients: ['Rabarbaro', 'Barbabietola'],
    name: 'L\'Osteria del Tempo Perso',
  },
  {
    _id: new ObjectId('cccccccccccccccccccccccc'),
    createdAt: new Date(2023, 3, 27, 0, 0, 0, 0),
    updatedAt: new Date(2023, 3, 27, 1, 0, 0, 0),
    creatorId: 'cccccccccccccccccccccccc',
    updaterId: 'cccccccccccccccccccccccc',
    __STATE__: STATES.PUBLIC,
    ingredients: ['Orecchiette', 'Rape'],
    location: {
      type: 'Point',
      coordinates: [69, 100],
    },
    name: 'Taverna a Mare',
  },
]
