import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, group, sleep } from 'k6';

// 
// Test on collection "customers"
// Type of test: stress test
// 
// 5 concurrent users for the first 5 seconds
// Then number of users rise to 200 in a 10-seconds span
// It stays high for 45 seconds
// Then it goes back to 5 users in 30 seconds to conclude the test
// 

export const options = {
    stages: [
        { duration: '5s', target: 5 },
        { duration: '10s', target: 200 },
        { duration: '45s', target: 200 },
        { duration: '30s', target: 5 },
    ],    
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<250'],
    }
}

export default function () {
    // #region helper fns
    const is200 = r => r.status === 200
    //#endregion

    group('GET methods', () => {
        // GET / request
        const get = http.get('http://crud-service:3000/registered-customers?shopID=2')
        check(get, { 'GET / returns status 200': is200 })
        sleep(1)

        // GET /_q=... request
        const _q = JSON.stringify({ purchasesCount: { $gte: 100 }})
        const getWithQuery = http.get(`http://crud-service:3000/registered-customers/?_q=${_q}`)
        check(getWithQuery, { 'GET /?_q=... returns status 200': is200 })
        sleep(1)
    
        // GET /count request
        const getCount = http.get('http://crud-service:3000/registered-customers/count?canBeContacted=true')
        check(getCount, { 'GET /count returns status 200': is200 })
        sleep(1)
    
        // GET /export request
        const getExport = http.get('http://crud-service:3000/registered-customers/export?shopID=2')
        check(getExport, { 'GET /export returns status 200': is200 })
        sleep(1)
    })

}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
  }
  
//   bench-k6-stress-test-1  |      █ GET methods
//   bench-k6-stress-test-1  | 
//   bench-k6-stress-test-1  |        ✓ GET / returns status 200
//   bench-k6-stress-test-1  |        ✓ GET /?_q=... returns status 200
//   bench-k6-stress-test-1  |        ✓ GET /count returns status 200
//   bench-k6-stress-test-1  |        ✓ GET /export returns status 200
//   bench-k6-stress-test-1  | 
//   bench-k6-stress-test-1  |    ✓ checks.........................: 100.00% ✓ 1384      ✗ 0    
//   bench-k6-stress-test-1  |      data_received..................: 40 MB   379 kB/s
//   bench-k6-stress-test-1  |      data_sent......................: 175 kB  1.7 kB/s
//   bench-k6-stress-test-1  |      group_duration.................: avg=48.09s   min=4.16s   med=49.49s   max=1m16s    p(90)=1m4s     p(95)=1m5s   
//   bench-k6-stress-test-1  |      http_req_blocked...............: avg=93.14µs  min=2.08µs  med=8.7µs    max=23.86ms  p(90)=326.77µs p(95)=437.9µs
//   bench-k6-stress-test-1  |      http_req_connecting............: avg=65.97µs  min=0s      med=0s       max=23.8ms   p(90)=226.75µs p(95)=315.6µs
//   bench-k6-stress-test-1  |      http_req_duration..............: avg=11.05s   min=1.95ms  med=10.7s    max=31.7s    p(90)=23.27s   p(95)=25.31s 
//   bench-k6-stress-test-1  |        { expected_response:true }...: avg=11.05s   min=1.95ms  med=10.7s    max=31.7s    p(90)=23.27s   p(95)=25.31s 
//   bench-k6-stress-test-1  |    ✓ http_req_failed................: 0.00%   ✓ 0         ✗ 1384 
//   bench-k6-stress-test-1  |      http_req_receiving.............: avg=688.45ms min=23.07µs med=139.52µs max=11.61s   p(90)=2.39s    p(95)=5s     
//   bench-k6-stress-test-1  |      http_req_sending...............: avg=39.57µs  min=6.08µs  med=34.25µs  max=258.58µs p(90)=66.86µs  p(95)=90.71µs
//   bench-k6-stress-test-1  |      http_req_tls_handshaking.......: avg=0s       min=0s      med=0s       max=0s       p(90)=0s       p(95)=0s     
//   bench-k6-stress-test-1  |      http_req_waiting...............: avg=10.36s   min=1.88ms  med=8.05s    max=31.7s    p(90)=23.27s   p(95)=25.31s 
//   bench-k6-stress-test-1  |      http_reqs......................: 1384    13.097311/s
//   bench-k6-stress-test-1  |      iteration_duration.............: avg=48.09s   min=4.16s   med=49.49s   max=1m16s    p(90)=1m4s     p(95)=1m5s   
//   bench-k6-stress-test-1  |      iterations.....................: 329     3.11345/s
//   bench-k6-stress-test-1  |      vus............................: 9       min=1       max=200
//   bench-k6-stress-test-1  |      vus_max........................: 200     min=200     max=200
//   bench-k6-stress-test-1  | running (1m45.7s), 000/200 VUs, 329 complete and 27 interrupted iterations
//   bench-k6-stress-test-1  | default ✓ [ 100% ] 000/200 VUs  1m30s  
  