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

import http from 'k6/http'
import { sleep, check } from 'k6'
import {
  randomIntBetween,
  randomString,
} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

//
// This file represent a stub of a k6 test. Feel free to modify based on your needs.
//

const generateItems = (length = 10000) => {
  return Array.from(Array(length).keys()).map((counter) => ({
    string: randomString(5),
    number: randomIntBetween(1, 10),
    boolean: randomIntBetween(0, 1) === 1,
    date: new Date(randomIntBetween(0, 10)),
    object: {
      string: `object-${randomString(5)}`,
      number: randomIntBetween(1, 10),
      boolean: randomIntBetween(0, 1) === 1,
      counter,
    },
    array: Array.from(Array(randomIntBetween(1, 10)).keys()).map((i) => ({
      string: `array-${i}-${randomString(5)}`,
      number: randomIntBetween(1, 10),
      boolean: randomIntBetween(0, 1) === 1,
    })),
  }))
}

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 20 },
    { duration: '150s', target: 50 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 5 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{type:bulk}': ['p(90)<4500'],
  },
}

export function setup() {
  // Here it goes any code we want to execute before running our tests
  const getProbe = http.get(`http://crud-service:3000/items/`, {
    headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
    tags: { type: 'get' },
  })
  check(getProbe, { 'GET /items returns status 200': res => res.status === 200 })
}

export default function() {
  const items = generateItems()

  const postList = http.post(`http://crud-service:3000/items/bulk`, JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
    tags: { type: 'bulk' },
  })
  check(postList, { 'POST / returns status 200': res => res.status === 200 })
}

export function teardown(data) {
  // Here it goes any code we want to execute after running our tests
}
