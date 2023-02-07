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
    displayName: 'via Calatafimi, 11',
    street: 'via Calatafimi',
    house_number: 11,
  },
  {
    _id: new ObjectId('222222222222222222222222'),
    displayName: 'via dei Pazzi, 0',
    street: 'via dei Pazzi',
    house_number: 0,
  },
  {
    _id: new ObjectId('333333333333333333333333'),
    displayName: 'via Cilea, 123',
    street: 'via Cilea',
    house_number: 123,
  },
]
