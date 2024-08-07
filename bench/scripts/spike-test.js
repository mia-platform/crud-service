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

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { executeGetTests } from './utils.js'

//
// Test on collection "customers"
// Type of test: spike test
//
// 5 concurrent users for the first 5 seconds
// Then number of users rise to 500 in a 20-seconds span
// Before to cool down to 5 users in 20 seconds to conclude the test
//

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 5 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{type:getList}': ['p(90)<250'],
    'http_req_duration{type:getListWithQueryOperator}': ['p(90)<250'],
    'http_req_duration{type:getById}': ['p(90)<250'],
    'http_req_duration{type:count}': ['p(90)<250'],
    'http_req_duration{type:export}': ['p(90)<250'],
  },
}

export default function() {
  executeGetTests('customers')
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { enableColors: true }),
  }
}
