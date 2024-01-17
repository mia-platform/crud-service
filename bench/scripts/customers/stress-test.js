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
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
  }
  
//   bench-k6-1  |      █ GET methods
//   bench-k6-1  | 
//   bench-k6-1  |        ✓ GET / returns status 200
//   bench-k6-1  |        ✓ GET /?_q=... returns status 200
//   bench-k6-1  |        ✓ GET /count returns status 200
//   bench-k6-1  |        ✓ GET /export returns status 200
//   bench-k6-1  | 
//   bench-k6-1  |    ✓ checks.........................: 100.00% ✓ 1565      ✗ 0    
//   bench-k6-1  |      data_received..................: 275 MB  2.7 MB/s
//   bench-k6-1  |      data_sent......................: 182 kB  1.8 kB/s
//   bench-k6-1  |      group_duration.................: avg=41.88s   min=4.18s  med=43.79s   max=1m5s     p(90)=47.93s   p(95)=50.12s  
//   bench-k6-1  |      http_req_blocked...............: avg=89.56µs  min=946ns  med=7.14µs   max=35.15ms  p(90)=228.48µs p(95)=395.63µs
//   bench-k6-1  |      http_req_connecting............: avg=70.79µs  min=0s     med=0s       max=34.97ms  p(90)=162.61µs p(95)=279.92µs
//   bench-k6-1  |      http_req_duration..............: avg=9.61s    min=2.8ms  med=8.34s    max=30.19s   p(90)=21.42s   p(95)=23.46s  
//   bench-k6-1  |        { expected_response:true }...: avg=9.61s    min=2.8ms  med=8.34s    max=30.19s   p(90)=21.42s   p(95)=23.46s  
//   bench-k6-1  |    ✓ http_req_failed................: 0.00%   ✓ 0         ✗ 1565 
//   bench-k6-1  |      http_req_receiving.............: avg=543.79ms min=9.41µs med=193.43µs max=12.03s   p(90)=1.02s    p(95)=4.71s   
//   bench-k6-1  |      http_req_sending...............: avg=33.32µs  min=3.1µs  med=28.15µs  max=312.75µs p(90)=65.42µs  p(95)=86.11µs 
//   bench-k6-1  |      http_req_tls_handshaking.......: avg=0s       min=0s     med=0s       max=0s       p(90)=0s       p(95)=0s      
//   bench-k6-1  |      http_req_waiting...............: avg=9.07s    min=2.37ms med=7.15s    max=30.19s   p(90)=21.42s   p(95)=23.46s  
//   bench-k6-1  |      http_reqs......................: 1565    15.578937/s
//   bench-k6-1  |      iteration_duration.............: avg=41.88s   min=4.18s  med=43.79s   max=1m5s     p(90)=47.93s   p(95)=50.12s  
//   bench-k6-1  |      iterations.....................: 365     3.633426/s
//   bench-k6-1  |      vus............................: 2       min=1       max=200
//   bench-k6-1  |      vus_max........................: 200     min=200     max=200
//   bench-k6-1  | running (1m40.5s), 000/200 VUs, 365 complete and 45 interrupted iterations
//   bench-k6-1  | default ✓ [ 100% ] 000/200 VUs  1m30s
  