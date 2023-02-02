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

module.exports = [
  {
    _id: new ObjectId('111111111111111111111111'),
    name: 'Luke, Skywalker',
    height: 172,
    films: [
      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
    ],
  },
  {
    _id: new ObjectId('222222222222222222222222'),
    name: 'C-3PO',
    height: 167,
    films: [
      new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
    ],
  },
  {
    _id: new ObjectId('333333333333333333333333'),
    name: 'R2-D2',
    height: 96,
    films: [
    ],
  },
  {
    _id: new ObjectId('444444444444444444444444'),
    name: 'Darth Vader',
    height: 202,
    films: [
      new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
      new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
      new ObjectId('cccccccccccccccccccccccc'),
    ],
  },
  {
    _id: new ObjectId('555555555555555555555555'),
    name: 'wrong data',
  },
]
