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
    _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
    addressId: new ObjectId('111111111111111111111111'),
    count: 1,
    tag: 'tag1',
  },
  {
    _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
    addressId: new ObjectId('222222222222222222222222'),
    count: 2,
    tag: 'tag1',
  },
  {
    _id: new ObjectId('cccccccccccccccccccccccc'),
    addressId: new ObjectId('333333333333333333333333'),
    count: 3,
    tag: 'tag1',
  },
  {
    _id: new ObjectId('dddddddddddddddddddddddd'),
    addressId: new ObjectId('111111111111111111111111'),
    count: 4,
    tag: 'tag2',
  },
  {
    _id: new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
    addressId: new ObjectId('222222222222222222222222'),
    count: 5,
    tag: 'tag2',
  },
  {
    _id: new ObjectId('ffffffffffffffffffffffff'),
    addressId: new ObjectId('222222222222222222222222'),
    count: 6,
    tag: 'tag3',
  },
]
