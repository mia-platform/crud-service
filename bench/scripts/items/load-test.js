import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, group, sleep } from 'k6';

import {
    randomIntBetween,
    randomString,
  } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// 
// Test on collection "items"
// Type of test: load test
// 
// We have a first stage where we insert documents for 1 minute
// When we're done, then we execute a round GET (list), GET by _q, PATCH by _q and DELETE by _q
// The following for 100 VUs for a minute
// 

export const options = {
    // TODO: Should I keep it?
    // discardResponseBodies: true,
    scenarios: {
        'initialLoad': {
            executor: 'constant-vus',
            exec: 'initialLoad',
            vus: 10,
            duration: '1m',
            tags: { test_type: 'initialLoad' }
        },
        'loadTest': {
            executor: 'constant-vus',
            exec: 'loadTest',
            vus: 100,
            startTime: '1m',
            duration: '1m',
            tags: { test_type: 'loadTest' }
        }
    },
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        'http_req_duration{test_type:initialLoad}': ['p(90)<100'],
        'http_req_duration{test_type:loadTest}': ['p(90)<200'],
        'http_req_duration{verb:GET}': ['p(90)<500'],
    },
}

// #region helper fns
const CRUD_BASE_URL = 'http://crud-service:3000'

const is200 = res => res.status === 200

let counter = 0
let idToSearchCounter = 125
let idToPatchCounter = 250
let idToDeleteCounter = 375

const generateItem = () => {
    const array = []
    const len = randomIntBetween(0, 10)
    for (let i = 0; i < len; i++) {
        array.push({
            string: `array-${i}-${randomString(5)}`,
            number: randomIntBetween(1, 10),
            boolean: randomIntBetween(0, 1) === 1,
        })
    }

    counter += 1

    return {
        string: randomString(5),
        number: randomIntBetween(1, 10),
        boolean: randomIntBetween(0, 1) === 1,
        date: new Date(randomIntBetween(0, 1705414020030)),
        object: {
            string: `object-${randomString(5)}`,
            number: randomIntBetween(1, 10),
            boolean: randomIntBetween(0, 1) === 1,
            counter
        },
        array
    }
}
//#endregion

export function initialLoad () {
    let post = http.post(
        `${CRUD_BASE_URL}/items`, 
        JSON.stringify(generateItem()), 
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(post, { 'POST / returns status 200': is200 })

    sleep(1)
}

export function loadTest () {
    // TODO: Should I put everything in the same request so I can 
    group('GET requests', () => {
        // GET / request
        const get = http.get(`${CRUD_BASE_URL}/items?number=${randomIntBetween(1, 10)}`, { tags: { verb: 'GET' }})
        check(get, { 'GET / returns status 200': is200 })

        const _q = JSON.stringify({ 'object.counter': idToSearchCounter })
        const getById = http.get(`${CRUD_BASE_URL}/items?_q=${_q}`, { tags: { verb: 'GET' }})
        check(getById, { 'GET /{id} returns status 200': is200 })

        sleep(1)
        idToSearchCounter += 1
    })

    group('PATCH requests', () => {
        // TODO: Patch not working correctly, find out why
        const _q = JSON.stringify({ 'object.counter': idToPatchCounter })
        
        // PATCH / request
        const patch = http.patch(
        `${CRUD_BASE_URL}/items?_q=${_q}`, 
        JSON.stringify(generateItem()), 
        { 
            headers: { 'Content-Type': 'application/json' },
            tags: { verb: 'PATCH' }
        }
        );
        check(patch, { 'PATCH / returns status 200': is200 })
        
        sleep(1)
        idToPatchCounter += 1
    })

    group('DELETE requests', () => {
        const _q = JSON.stringify({ 'object.counter': idToDeleteCounter })
        
        // DELETE / request
        const deleteReq = http.del(`${CRUD_BASE_URL}/items?_q=${_q}`, null,  { tags: { verb: 'DELETE' }}) 
        check(deleteReq, { 'DELETE / returns status 200': is200 })

        sleep(1)
        idToDeleteCounter += 1
    })
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true })
    };
}

// bench-k6-load-test-1  |      ✓ POST / returns status 200
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |      █ GET requests
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |        ✓ GET / returns status 200
// bench-k6-load-test-1  |        ✓ GET /{id} returns status 200
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |      █ PATCH requests
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |        ✗ PATCH / returns status 200
// bench-k6-load-test-1  |         ↳  0% — ✓ 0 / ✗ 2000
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |      █ DELETE requests
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |        ✓ DELETE / returns status 200
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |    ✗ checks.........................: 76.74% ✓ 6600      ✗ 2000 
// bench-k6-load-test-1  |      data_received..................: 33 MB  272 kB/s
// bench-k6-load-test-1  |      data_sent......................: 2.2 MB 18 kB/s
// bench-k6-load-test-1  |      group_duration.................: avg=1.01s   min=1s       med=1s      max=1.69s    p(90)=1.02s    p(95)=1.03s   
// bench-k6-load-test-1  |      http_req_blocked...............: avg=32.36µs min=553ns    med=2.84µs  max=21.67ms  p(90)=8µs      p(95)=12.93µs 
// bench-k6-load-test-1  |      http_req_connecting............: avg=21.35µs min=0s       med=0s      max=20.69ms  p(90)=0s       p(95)=0s      
// bench-k6-load-test-1  |      http_req_duration..............: avg=9.73ms  min=199.34µs med=3.16ms  max=642.29ms p(90)=14.21ms  p(95)=20.81ms 
// bench-k6-load-test-1  |        { expected_response:true }...: avg=12.32ms min=633.29µs med=4.35ms  max=642.29ms p(90)=16.46ms  p(95)=24.39ms 
// bench-k6-load-test-1  |      ✓ { test_type:initialLoad }....: avg=4.77ms  min=668.34µs med=4.01ms  max=23.76ms  p(90)=7.51ms   p(95)=11.65ms 
// bench-k6-load-test-1  |      ✓ { test_type:loadTest }.......: avg=10.1ms  min=199.34µs med=3ms     max=642.29ms p(90)=14.53ms  p(95)=21.81ms 
// bench-k6-load-test-1  |      ✓ { verb:GET }.................: avg=18.38ms min=782.67µs med=7ms     max=642.29ms p(90)=21.81ms  p(95)=34.3ms  
// bench-k6-load-test-1  |    ✗ http_req_failed................: 23.25% ✓ 2000      ✗ 6600 
// bench-k6-load-test-1  |      http_req_receiving.............: avg=58.79µs min=6.89µs   med=35.88µs max=1.98ms   p(90)=113.02µs p(95)=166.26µs
// bench-k6-load-test-1  |      http_req_sending...............: avg=25.92µs min=3.02µs   med=11.77µs max=22.49ms  p(90)=39.13µs  p(95)=50.69µs 
// bench-k6-load-test-1  |      http_req_tls_handshaking.......: avg=0s      min=0s       med=0s      max=0s       p(90)=0s       p(95)=0s      
// bench-k6-load-test-1  |      http_req_waiting...............: avg=9.64ms  min=178.89µs med=3.08ms  max=642.23ms p(90)=14.11ms  p(95)=20.71ms 
// bench-k6-load-test-1  |      http_reqs......................: 8600   70.885514/s
// bench-k6-load-test-1  |      iteration_duration.............: avg=2.57s   min=1s       med=3.01s   max=3.7s     p(90)=3.04s    p(95)=3.07s   
// bench-k6-load-test-1  |      iterations.....................: 2600   21.430504/s
// bench-k6-load-test-1  |      vus............................: 39     min=10      max=100
// bench-k6-load-test-1  |      vus_max........................: 110    min=110     max=110
// bench-k6-load-test-1  | running (2m01.3s), 000/110 VUs, 2600 complete and 0 interrupted iterations
// bench-k6-load-test-1  | initialLoad ✓ [ 100% ] 10 VUs   1m0s
// bench-k6-load-test-1  | loadTest    ✓ [ 100% ] 100 VUs  1m0s
// bench-k6-load-test-1  | time="2024-01-18T09:37:59Z" level=error msg="thresholds on metrics 'checks, http_req_failed' have been crossed"

