
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

const tap = require('tap')
const { STATES, __STATE__ } = require('../lib/consts')
const { getStateQuery } = require('../lib/CrudService.utils')

tap.test('crudService utils', async test => {
  test.test('getStateQuery', async t => {
    t.test('one state returns basic query', async assert => {
      const mockStates = [STATES.DRAFT]
      const queryResult = getStateQuery(mockStates)
      assert.strictSame(queryResult, { [__STATE__]: STATES.DRAFT })
    })

    t.test('empty array returns default query', async assert => {
      const mockStates = []
      const queryResult = getStateQuery(mockStates)
      assert.strictSame(queryResult, { [__STATE__]: STATES.PUBLIC })
    })

    t.test('more states returns $in query', async assert => {
      const mockStates = [STATES.PUBLIC, STATES.DELETED]
      const queryResult = getStateQuery(mockStates)
      assert.strictSame(queryResult, { [__STATE__]: { $in: [STATES.PUBLIC, STATES.DELETED] } })
    })
  })
})
