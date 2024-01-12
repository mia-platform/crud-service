import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, group, sleep } from 'k6';


export const options = {
    stages: [
        { duration: '5s', target: 5 }, // base level, 5 users
        { duration: '20s', target: 500 }, // traffic ramp-up from 5 to a higher 500 users over 20 seconds
        { duration: '20s', target: 5 }, // back down to 5 users in 20s
    ],    
    thresholds: {
        checks: ['rate==1'], // every check must pass
        http_req_failed: ['rate<0.01'], // http errors should be less than 1%
        // http_req_duration: ['p(95)<100'], // 95% of requests should be below 50ms
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

// bench-k6-1  |      █ GET methods
// bench-k6-1  | 
// bench-k6-1  |        ✓ GET / returns status 200
// bench-k6-1  |        ✓ GET /?_q=... returns status 200
// bench-k6-1  |        ✓ GET /count returns status 200
// bench-k6-1  |        ✓ GET /export returns status 200
// bench-k6-1  | 
// bench-k6-1  |    ✓ checks.........................: 100.00% ✓ 876       ✗ 0    
// bench-k6-1  |      data_received..................: 38 MB   503 kB/s
// bench-k6-1  |      data_sent......................: 156 kB  2.1 kB/s
// bench-k6-1  |      group_duration.................: avg=31.05s   min=4.19s  med=34.85s   max=1m8s     p(90)=1m0s     p(95)=1m4s    
// bench-k6-1  |      http_req_blocked...............: avg=325.64µs min=1.6µs  med=152.88µs max=32.59ms  p(90)=477.81µs p(95)=562.96µs
// bench-k6-1  |      http_req_connecting............: avg=253.44µs min=0s     med=108.03µs max=32.45ms  p(90)=338.39µs p(95)=402.68µs
// bench-k6-1  |      http_req_duration..............: avg=13.49s   min=3.15ms med=8.39s    max=50.62s   p(90)=33.21s   p(95)=38s     
// bench-k6-1  |        { expected_response:true }...: avg=13.49s   min=3.15ms med=8.39s    max=50.62s   p(90)=33.21s   p(95)=38s     
// bench-k6-1  |    ✓ http_req_failed................: 0.00%   ✓ 0         ✗ 876  
// bench-k6-1  |      http_req_receiving.............: avg=257.1ms  min=16.1µs med=332.81µs max=36.69s   p(90)=1.77ms   p(95)=3.41ms  
// bench-k6-1  |      http_req_sending...............: avg=56.71µs  min=6.05µs med=47.38µs  max=524.89µs p(90)=104.83µs p(95)=123.63µs
// bench-k6-1  |      http_req_tls_handshaking.......: avg=0s       min=0s     med=0s       max=0s       p(90)=0s       p(95)=0s      
// bench-k6-1  |      http_req_waiting...............: avg=13.23s   min=2.75ms med=8.34s    max=49.76s   p(90)=33.07s   p(95)=37.94s  
// bench-k6-1  |      http_reqs......................: 876     11.679636/s
// bench-k6-1  |      iteration_duration.............: avg=31.06s   min=4.19s  med=34.85s   max=1m8s     p(90)=1m0s     p(95)=1m4s    
// bench-k6-1  |      iterations.....................: 14      0.186661/s
// bench-k6-1  |      vus............................: 9       min=1       max=500
// bench-k6-1  |      vus_max........................: 500     min=500     max=500
// bench-k6-1  | running (1m15.0s), 000/500 VUs, 14 complete and 494 interrupted iterations
// bench-k6-1  | default ✓ [ 100% ] 001/500 VUs  45s

  