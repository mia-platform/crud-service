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

const { STATES, __STATE__ } = require('./consts')

function getStateQuery(states) {
  if (!states || states.length === 0) {
    return { [__STATE__]: STATES.PUBLIC }
  }

  if (states.length === 1) {
    return { [__STATE__]: states[0] }
  }

  return { [__STATE__]: { $in: states } }
}

module.exports = {
  getStateQuery,
}
