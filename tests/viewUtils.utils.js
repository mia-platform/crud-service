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

const { STATES } = require('../lib/consts')
const ordersFixture = require('./fixtures/orders')
const ridersFixture = require('./fixtures/riders')

const expectedOrderDetailsViewDocs = ordersFixture
  .map(order => {
    const { id_rider: idRider, ...viewField } = order
    const {
      _id,
      name,
      surname,
    } = ridersFixture
      .find(rider => rider._id.toString() === idRider.toString())

    return {
      ...viewField,
      rider: {
        label: `${name} ${surname}`,
        value: _id,
      },
    }
  })

const expectedOrderDetailsViewDocsPublic = expectedOrderDetailsViewDocs
  .filter(doc => doc.__STATE__ === STATES.PUBLIC)

const riderObjectToLookup = ({ name, surname, _id }) => ({
  label: `${name} ${surname}`,
  value: _id,
})

const expectedRidersLookup = ridersFixture.map(riderObjectToLookup)

module.exports = {
  lookupAddressPrefix: '/orders-details-endpoint/lookup/rider',
  prefix: '/orders-endpoint',
  ordersFixture,
  ridersFixture,
  expectedOrderDetailsViewDocs,
  expectedOrderDetailsViewDocsPublic,
  expectedRidersLookup,
  riderObjectToLookup,
}
