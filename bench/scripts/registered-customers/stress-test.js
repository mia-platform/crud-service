import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, sleep } from 'k6';

// 
// Test on view "registered-customers"
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
        { duration: '10s', target: 100 },
        { duration: '45s', target: 100 },
        { duration: '30s', target: 5 },
        { duration: '10s', target: 5 },
    ],
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        'http_req_duration{type:getList}': ['p(90)<250'],
        'http_req_duration{type:getListViaQuery}': ['p(90)<250'],
        'http_req_duration{type:count}': ['p(90)<250'],
        'http_req_duration{type:export}': ['p(90)<250'],
    }
}

// #region helper fns
const is200 = r => r.status === 200
//#endregion
    
export default function () {
    // GET / request
    const get = http.get('http://crud-service:3000/registered-customers?shopID=2', { tags: { type: 'getList' }})
    check(get, { 'GET / returns status 200': is200 })
    sleep(0.1)

    // GET /_q=... request
    const _q = JSON.stringify({ purchasesCount: { $gte: 100 }})
    const getWithQuery = http.get(`http://crud-service:3000/registered-customers/?_q=${_q}`, { tags: { type: 'getListViaQuery' }})
    check(getWithQuery, { 'GET /?_q=... returns status 200': is200 })
    sleep(0.1)

    // GET /count request
    const getCount = http.get('http://crud-service:3000/registered-customers/count?canBeContacted=true',  { tags: { type: 'count' }})
    check(getCount, { 'GET /count returns status 200': is200 })
    sleep(0.1)

    // GET /export request
    const getExport = http.get('http://crud-service:3000/registered-customers/export?shopID=2',  { tags: { type: 'export' }})
    check(getExport, { 'GET /export returns status 200': is200 })
    sleep(0.1)
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
}
