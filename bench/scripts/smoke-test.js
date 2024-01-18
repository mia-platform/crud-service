import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, sleep } from 'k6';

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
    // Here it goes any code we want to execute before running our tests
}

// #region helper fns
const is200 = r => r.status === 200
//#endregion
    
export default function () {
    // GET / request
    const get = http.get('http://crud-service:3000/customers?shopID=2', { tags: { request: 'getList' }})
    check(get, { 'GET / returns status 200': is200 })
    sleep(1)

    // Fetch for the seventh document from the getList request to get an id to use for a getById request
    const getLitResults = JSON.parse(getList.body)
    const count = getLitResults.length
    const document = getLitResults[7 % count]

    if (document) {
        // GET /{id} request
        const getById = http.get(`http://crud-service:3000/customers/${document._id}`, { tags: { type: 'getById' }})
        check(getById, { 'GET/{id} returns status 200': is200 })
        sleep(0.1)
    }

    // GET /_q=... request
    const _q = JSON.stringify({ purchasesCount: { $gte: 100 }})
    const getWithQuery = http.get(`http://crud-service:3000/customers/?_q=${_q}`, { tags: { request: 'getList via _q' }})
    check(getWithQuery, { 'GET /?_q=... returns status 200': is200 })
    sleep(1)

    // GET /count request
    const getCount = http.get('http://crud-service:3000/customers/count?canBeContacted=true',  { tags: { request: 'count' }})
    check(getCount, { 'GET /count returns status 200': is200 })
    sleep(1)

    // GET /export request
    const getExport = http.get('http://crud-service:3000/customers/export?shopID=2',  { tags: { request: 'export' }})
    check(getExport, { 'GET /export returns status 200': is200 })
    sleep(1)
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
}

export function teardown(data) {
    // Here it goes any code we want to execute after running our tests
}
