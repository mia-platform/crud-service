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

const {
  __STATE__,
  STATES,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../../lib/consts')
const { ObjectId } = require('mongodb')

const updatedAtDate = new Date('2017-11-11')
const createdAtDate = new Date('2017-11-10')
const updatedAtDateISO = updatedAtDate.toISOString()
const createdAtDateISO = createdAtDate.toISOString()
const creatorId = 'my-creator-id'
const updaterId = 'my-updated-id'

module.exports = {
  response: [
    {
      _id: '111111111111111111111111',
      items: [
        { label: 'spatzle', value: '555555555555555555555555' },
        { label: 'lasagna', value: '666666666666666666666666' },
      ],
      paid: true,
      [CREATEDAT]: createdAtDateISO,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDateISO,
      [__STATE__]: STATES.PUBLIC,
    },
    {
      _id: '222222222222222222222222',
      items: [
        { label: 'spatzle', value: '555555555555555555555555' },
        { label: 'pizza', value: '777777777777777777777777' },
      ],
      paid: true,
      [CREATEDAT]: createdAtDateISO,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDateISO,
      [__STATE__]: STATES.PUBLIC,
    },
    {
      _id: '333333333333333333333333',
      items: [
        { label: 'piadina', value: '888888888888888888888888' },
      ],
      paid: true,
      [CREATEDAT]: createdAtDateISO,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDateISO,
      [__STATE__]: STATES.PUBLIC,
    },
  ],
  documents: [
    {
      _id: ObjectId.createFromHexString('111111111111111111111111'),
      items: [
        { label: 'spatzle', value: ObjectId.createFromHexString('555555555555555555555555') },
        { label: 'lasagna', value: ObjectId.createFromHexString('666666666666666666666666') },
      ],
      paid: true,
      [CREATEDAT]: createdAtDate,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDate,
      [__STATE__]: STATES.PUBLIC,
    },
    {
      _id: ObjectId.createFromHexString('222222222222222222222222'),
      items: [
        { label: 'spatzle', value: ObjectId.createFromHexString('555555555555555555555555') },
        { label: 'pizza', value: ObjectId.createFromHexString('777777777777777777777777') },
      ],
      paid: true,
      [CREATEDAT]: createdAtDate,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDate,
      [__STATE__]: STATES.PUBLIC,
    },
    {
      _id: ObjectId.createFromHexString('333333333333333333333333'),
      items: [
        { label: 'piadina', value: ObjectId.createFromHexString('888888888888888888888888') },
      ],
      paid: true,
      [CREATEDAT]: createdAtDate,
      [CREATORID]: creatorId,
      [UPDATERID]: updaterId,
      [UPDATEDAT]: updatedAtDate,
      [__STATE__]: STATES.PUBLIC,
    },
  ],
}
