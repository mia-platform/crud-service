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

const fixtures = [
  {
    _id: new ObjectId('000000000000000000000000'),
    name: 'fake name other-0',
    isbn: 'fake isbn other-0',
    authorAddressId: new ObjectId('111111111111111111111111'),
    price: 10,
  },
  {
    _id: new ObjectId('111111111111111111111111'),
    name: 'fake name other-1',
    isbn: 'fake isbn other-1',
    authorAddressId: new ObjectId('444444444444444444444444'),
    price: 11,
  },
  {
    _id: new ObjectId('222222222222222222222222'),
    name: 'fake name other-2',
    isbn: 'fake isbn other-2',
    authorAddressId: new ObjectId('222222222222222222222222'),
    price: 2,
  },
]

module.exports = fixtures
