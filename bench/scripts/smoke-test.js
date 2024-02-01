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

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { executeGetTests } from './utils.js';

// 
// Test on collection "customers"
// Type of test: smoke test
// 
// 5 concurrent users for 1 minutes
// 

export const options = {
    vus: 5,
    duration: '1m',
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(90)<150', 'p(95)<300'],
    }
}
    
export default function () {
    executeGetTests('customers')
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
}
