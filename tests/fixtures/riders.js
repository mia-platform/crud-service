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
const {
  __STATE__,
  STATES,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../../lib/consts')

const updatedAtDate = new Date('2017-11-11')
const createdAtDate = new Date('2017-11-10')
const creatorId = 'my-creator-id'
const updaterId = 'my-updated-id'

module.exports = [
  {
    _id: ObjectId.createFromHexString('111111111111111111111111'),
    name: 'Mario',
    surname: 'Rossi',
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('222222222222222222222222'),
    name: 'Jon',
    surname: 'Snow',
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('333333333333333333333333'),
    name: 'Harry',
    surname: 'Potter',
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('444444444444444444444444'),
    name: 'Harry',
    surname: 'Houdini',
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
]
