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
const CRUD_BASE_URL = 'http://localhost:3000'

const is200 = res => res.status === 200

let counter = 0
let idToSearchCounter = 250
let idToPatchCounter = 750
let idToDeleteCounter = 1250

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
        '${CRUD_BASE_URL}', 
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
        const get = http.get(`${CRUD_BASE_URL}?number=${randomIntBetween(1, 10)}`, { tags: { verb: 'GET' }})
        check(get, { 'GET / returns status 200': is200 })

        const _q = JSON.stringify({ 'object.counter': idToSearchCounter })
        const getById = http.get(`${CRUD_BASE_URL}/?_q=${_q}`, { tags: { verb: 'GET' }})
        check(getById, { 'GET /{id} returns status 200': is200 })

        sleep(1)
        idToSearchCounter += 1
    })

    group('PATCH requests', () => {
        const _q = JSON.stringify({ 'object.counter': idToPatchCounter })
        
        // PATCH / request
        const patch = http.patch(
        `${CRUD_BASE_URL}/?_q=${_q}`, 
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
        const deleteReq = http.del(`${CRUD_BASE_URL}/?_q=${_q}`, null,  { tags: { verb: 'DELETE' }}) 
        check(deleteReq, { 'DELETE / returns status 200': is200 })

        sleep(1)
        idToDeleteCounter += 1
    })
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
        // TODO: "Permission denied" when trying to save to file. How to fix this?
        // '/app/load-test-results.json': JSON.stringify(data)
    };
}

// bench-k6-load-test-1  | initialLoad ✓ [ 100% ] 10 VUs   20s
// bench-k6-load-test-1  | loadTest    ↓ [ 100% ] 100 VUs  1m0s
// bench-k6-load-test-1  |      ✗ POST / returns status 200
// bench-k6-load-test-1  |       ↳  9% — ✓ 6147 / ✗ 61975
// bench-k6-load-test-1  |      ✓ GET / returns status 200
// bench-k6-load-test-1  |      ✓ GET /?_q=... returns status 200
// bench-k6-load-test-1  |      ✓ GET /count returns status 200
// bench-k6-load-test-1  |      ✓ GET /export returns status 200
// bench-k6-load-test-1  | 
// bench-k6-load-test-1  |    ✗ checks.........................: 15.87% ✓ 11699      ✗ 61975
// bench-k6-load-test-1  |      data_received..................: 345 MB 4.1 MB/s
// bench-k6-load-test-1  |      data_sent......................: 22 MB  264 kB/s
// bench-k6-load-test-1  |      http_req_blocked...............: avg=8.75µs   min=531ns    med=1.15µs  max=60.34ms p(90)=3.59µs   p(95)=5.6µs   
// bench-k6-load-test-1  |      http_req_connecting............: avg=6.4µs    min=0s       med=0s      max=59.98ms p(90)=0s       p(95)=0s      
// bench-k6-load-test-1  |      http_req_duration..............: avg=12.21ms  min=212.77µs med=1.98ms  max=1.67s   p(90)=6.14ms   p(95)=15.37ms 
// bench-k6-load-test-1  |        { expected_response:true }...: avg=63.72ms  min=885.44µs med=5.76ms  max=1.67s   p(90)=186.8ms  p(95)=385.07ms
// bench-k6-load-test-1  |      ✓ { test_type:initialLoad }....: avg=2.81ms   min=212.77µs med=1.89ms  max=60.03ms p(90)=4.78ms   p(95)=6.32ms  
// bench-k6-load-test-1  |      ✗ { test_type:loadTest }.......: avg=127.57ms min=885.44µs med=24.53ms max=1.67s   p(90)=400.25ms p(95)=608.73ms
// bench-k6-load-test-1  |    ✗ http_req_failed................: 84.12% ✓ 61975      ✗ 11699
// bench-k6-load-test-1  |      http_req_receiving.............: avg=2.86ms   min=5.51µs   med=15.97µs max=1.38s   p(90)=48.76µs  p(95)=88.73µs 
// bench-k6-load-test-1  |      http_req_sending...............: avg=12.08µs  min=3.22µs   med=7.58µs  max=11.12ms p(90)=17.17µs  p(95)=24.43µs 
// bench-k6-load-test-1  |      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s      p(90)=0s       p(95)=0s      
// bench-k6-load-test-1  |      http_req_waiting...............: avg=9.33ms   min=193.11µs med=1.95ms  max=1.48s   p(90)=6.04ms   p(95)=13.08ms 
// bench-k6-load-test-1  |      http_reqs......................: 73674  875.496253/s
// bench-k6-load-test-1  |      iteration_duration.............: avg=93ms     min=310.4µs  med=2.02ms  max=5.89s   p(90)=5.35ms   p(95)=7.9ms   
// bench-k6-load-test-1  |      iterations.....................: 69510  826.013852/s
// bench-k6-load-test-1  |      vus............................: 8      min=8        max=100
// bench-k6-load-test-1  |      vus_max........................: 110    min=110      max=110
// bench-k6-load-test-1  | running (1m24.2s), 000/110 VUs, 69510 complete and 0 interrupted iterations
// bench-k6-load-test-1  | initialLoad ✓ [ 100% ] 10 VUs   20s
// bench-k6-load-test-1  | loadTest    ✓ [ 100% ] 100 VUs  1m0s
// bench-k6-load-test-1  | time="2024-01-16T15:08:18Z" level=error msg="thresholds on metrics 'checks, http_req_duration{test_type:loadTest}, http_req_failed' have been crossed"

