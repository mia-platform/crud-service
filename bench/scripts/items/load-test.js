import http from 'k6/http';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { check, sleep } from 'k6';

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
        'http_req_duration{type:getList}': ['p(90)<500'],
        'http_req_duration{type:getById}': ['p(90)<500'],
        'http_req_duration{type:patchByQuery}': ['p(90)<500'],
        'http_req_duration{type:deleteByQuery}': ['p(90)<500'],
    },
}

// #region helper fns
const CRUD_BASE_URL = 'http://crud-service:3000'

const is200 = res => res.status === 200

let counter = 0
let idToSearchCounter = 1250
let idToPatchCounter = 2500
let idToDeleteCounter = 3750

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

    sleep(0.01)
}

export function loadTest () {
    // TODO: This can be improved by using results from GET to have values to execute GET (by Id), PATCH and DELETE methods
    // TODO: Evaluate if add a post stage also here
    
    // GET / request
    const get = http.get(`${CRUD_BASE_URL}/items?number=${randomIntBetween(1, 10)}`, { tags: { type: 'getList' }})
    check(get, { 'GET / returns status 200': is200 })

    const getQuery = JSON.stringify({ 'object.counter': idToSearchCounter })
    const getById = http.get(`${CRUD_BASE_URL}/items?_q=${getQuery}`, { tags: { type: 'getById' }})
    check(getById, { 'GET /{id} returns status 200': is200 })

    sleep(1)
    idToSearchCounter += 1

    const patchQuery = JSON.stringify({ 'object.counter': idToPatchCounter })
    
    // PATCH / request
    const patch = http.patch(
    `${CRUD_BASE_URL}/items?_q=${patchQuery}`, 
    JSON.stringify({ $set: generateItem() }), 
    { 
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'patchByQuery' }
    }
    );
    check(patch, { 'PATCH / returns status 200': is200 })
    
    sleep(1)
    idToPatchCounter += 1

    const deleteQuery = JSON.stringify({ 'object.counter': idToDeleteCounter })
    
    // DELETE / request
    const deleteReq = http.del(`${CRUD_BASE_URL}/items?_q=${deleteQuery}`, null,  { tags: { type: 'deleteByQuery' }}) 
    check(deleteReq, { 'DELETE / returns status 200': is200 })

    sleep(1)
    idToDeleteCounter += 1
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true })
    };
}
