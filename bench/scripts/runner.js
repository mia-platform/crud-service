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

import http from 'k6/http';
import { sleep } from 'k6';

// 
// This file represent a stub of a k6 test. Feel free to modify based on your needs.
// 

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
    ],
}

export function setup() {
    // Here it goes any code we want to execute before running our tests
}

export default function () {
    http.get('http://crud-service:3000/users/export?shopID=2')
    sleep(1)
}

export function teardown(data) {
    // Here it goes any code we want to execute after running our tests
}
