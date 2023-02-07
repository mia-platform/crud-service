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

const date2 = new Date('2017-11-22')

const updatedAtDate = new Date('2017-11-11')
const createdAtDate = new Date('2017-11-10')
const creatorId = 'my-creator-id'
const updaterId = 'my-updated-id'

const data = []
for (let index = 0; index < 201; index++) {
  data.push({
    _id: ObjectId.createFromHexString(`999999999999999999999${(`${index}`).padStart(3, '0')}`),
    name: `fake name other-${index}`,
    author: `fake author other-${index}`,
    isbn: `fake isbn other-${index}`,
    price: 5,
    isPromoted: false,
    publishDate: date2,
    attachments: [],
    additionalInfo: null,
    editionsDates: null,
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  })
}
module.exports = data
