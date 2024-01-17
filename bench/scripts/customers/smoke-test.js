import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, group, sleep } from 'k6';

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

export function setup() {
    // TODO: 
}

export default function () {
    // #region helper fns
    const is200 = r => r.status === 200
    //#endregion

    group('GET methods', () => {
        // GET / request
        const get = http.get('http://crud-service:3000/customers?shopID=2')
        check(get, { 'GET / returns status 200': is200 })
        sleep(1)

        // GET /_q=... request
        const _q = JSON.stringify({ purchasesCount: { $gte: 100 }})
        const getWithQuery = http.get(`http://crud-service:3000/customers/?_q=${_q}`)
        check(getWithQuery, { 'GET /?_q=... returns status 200': is200 })
        sleep(1)
    
        // GET /count request
        const getCount = http.get('http://crud-service:3000/customers/count?canBeContacted=true')
        check(getCount, { 'GET /count returns status 200': is200 })
        sleep(1)
    
        // GET /export request
        const getExport = http.get('http://crud-service:3000/customers/export?shopID=2')
        check(getExport, { 'GET /export returns status 200': is200 })
        sleep(1)
    })

}

export function handleSummary(data) {
    // console.log({ data: JSON.stringify(data, null, 2)})
    return {
        stdout: textSummary(data, { enableColors: true }),
        // TODO: "Permission denied" when trying to save to file. How to fix this?
        // '/app/smoke-test-results.json': JSON.stringify(data)
    };
  }

export function teardown(data) {
    // TODO
}

// bench-k6-1  |      █ GET methods
// bench-k6-1  | 
// bench-k6-1  |        ✓ GET / returns status 200
// bench-k6-1  |        ✓ GET /?_q=... returns status 200
// bench-k6-1  |        ✓ GET /count returns status 200
// bench-k6-1  |        ✓ GET /export returns status 200
// bench-k6-1  | 
// bench-k6-1  |      █ teardown
// bench-k6-1  | 
// bench-k6-1  |    ✓ checks.........................: 100.00% ✓ 100      ✗ 0  
// bench-k6-1  |      data_received..................: 18 MB   856 kB/s
// bench-k6-1  |      data_sent......................: 11 kB   529 B/s
// bench-k6-1  |      group_duration.................: avg=4.25s   min=4.15s   med=4.22s    max=4.46s    p(90)=4.39s   p(95)=4.43s   
// bench-k6-1  |      http_req_blocked...............: avg=26.78µs min=2.68µs  med=5.72µs   max=441.73µs p(90)=9.22µs  p(95)=39.07µs 
// bench-k6-1  |      http_req_connecting............: avg=5.75µs  min=0s      med=0s       max=148.6µs  p(90)=0s      p(95)=4.54µs  
// bench-k6-1  |    ✓ http_req_duration..............: avg=63.53ms min=2.93ms  med=58.95ms  max=317.12ms p(90)=97.44ms p(95)=212.9ms 
// bench-k6-1  |        { expected_response:true }...: avg=63.53ms min=2.93ms  med=58.95ms  max=317.12ms p(90)=97.44ms p(95)=212.9ms 
// bench-k6-1  |    ✓ http_req_failed................: 0.00%   ✓ 0        ✗ 100
// bench-k6-1  |      http_req_receiving.............: avg=6.21ms  min=27.46µs med=178.72µs max=43.2ms   p(90)=22.46ms p(95)=27.49ms 
// bench-k6-1  |      http_req_sending...............: avg=25.21µs min=9.72µs  med=23.84µs  max=73.14µs  p(90)=36.86µs p(95)=39.35µs 
// bench-k6-1  |      http_req_tls_handshaking.......: avg=0s      min=0s      med=0s       max=0s       p(90)=0s      p(95)=0s      
// bench-k6-1  |      http_req_waiting...............: avg=57.29ms min=2.19ms  med=50.74ms  max=316.99ms p(90)=97.33ms p(95)=212.81ms
// bench-k6-1  |      http_reqs......................: 100     4.654264/s
// bench-k6-1  |      iteration_duration.............: avg=3.94s   min=1.56µs  med=4.21s    max=4.46s    p(90)=4.39s   p(95)=4.43s   
// bench-k6-1  |      iterations.....................: 25      1.163566/s
// bench-k6-1  |      vus............................: 5       min=5      max=5
// bench-k6-1  |      vus_max........................: 5       min=5      max=5
// bench-k6-1  | running (0m21.5s), 0/5 VUs, 25 complete and 0 interrupted iterations
// bench-k6-1  | default ✓ [ 100% ] 5 VUs  0m21.5s/2m0s  25/25 shared iters
