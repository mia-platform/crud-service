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
    _id: new ObjectId('111111111111111111111111'),
    name: 'fufi',
    family: 'canines',
    specie: 'dog',
    weight: 14,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('222222222222222222222222'),
    name: 'oliver',
    family: 'felines',
    specie: 'cat',
    weight: 6,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('333333333333333333333333'),
    name: 'mufasa',
    family: 'felines',
    specie: 'lion',
    weight: 100,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('444444444444444444444444'),
    name: 'kitty',
    family: 'felines',
    specie: 'cat',
    weight: 4,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('555555555555555555555555'),
    name: 'scar',
    family: 'felines',
    specie: 'lion',
    weight: 80,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('666666666666666666666666'),
    name: 'fido',
    family: 'canines',
    specie: 'dog',
    weight: 17,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('777777777777777777777777'),
    name: 'cerbero',
    family: 'canines',
    specie: 'dog',
    weight: 200,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('888888888888888888888888'),
    name: 'balto',
    family: 'canines',
    specie: 'wolf',
    weight: 37,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: new ObjectId('999999999999999999999999'),
    name: 'koga',
    family: 'canines',
    specie: 'wolf',
    weight: 24,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
]
