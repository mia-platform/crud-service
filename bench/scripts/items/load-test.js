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
        'http_req_duration{type:post}': ['p(90)<100'],
        'http_req_duration{type:getList}': ['p(90)<500'],
        'http_req_duration{type:getById}': ['p(90)<500'],
        'http_req_duration{type:patchByQuery}': ['p(90)<500'],
        'http_req_duration{type:patchById}': ['p(90)<500'],
        'http_req_duration{type:deleteByQuery}': ['p(90)<500'],
        'http_req_duration{type:deleteById}': ['p(90)<500'],
    },
}

// #region helper fns
const CRUD_BASE_URL = 'http://crud-service:3000'

const is200 = res => res.status === 200
const is200or404 = res => [200, 404].includes(res.status)
const is204or404 = res => [204, 404].includes(res.status)

let counter = 0
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
        { 
            headers: { 'Content-Type': 'application/json' },
            tags: { type: 'post' }
        }
    );
    check(post, { 'POST / returns status 200':  is200or404 })

    sleep(0.01)
}

export function loadTest () {
    // TODO: This can be improved by using results from GET to have values to execute GET (by Id), PATCH and DELETE methods
    // TODO: Evaluate if add a post stage also here
    
    // GET / request
    const getList = http.get(`${CRUD_BASE_URL}/items?number=${randomIntBetween(1, 10)}`, { tags: { type: 'getList' }})
    check(getList, { 'GET / returns status 200':  is200 })
    sleep(1)

    // Fetch for the seventh document from the getList request to get an id to use for a getById request
    const getListResults = JSON.parse(getList.body)
    const count = getListResults.length
    if (count === 0) {
        return
    }

    // GET /{id} request
    const documentIdToFetch = getListResults[randomIntBetween(0, count - 1)]._id
    const getById = http.get(`${CRUD_BASE_URL}/items/${documentIdToFetch}`, { tags: { type: 'getById' }})
    const isGetByIdValid = check(getById, { 'GET /{id} returns status 200 or 404':  is200or404 })
    if (!isGetByIdValid) { console.log({ failed: 'getById', error: getById.error, status: getById.status, documentId: documentIdToFetch })}
    sleep(1)

    // PATCH /{id} request
    const documentIdToPatch = getListResults[randomIntBetween(0, count - 1)]._id
    const patchById = http.patch(
        `${CRUD_BASE_URL}/items/${documentIdToPatch}`,
        JSON.stringify({ $set: generateItem() }),
        { 
            headers: { 'Content-Type': 'application/json' }, 
            tags: { type: 'patchById' } 
        }
    )
    const isPatchByIdValid = check(patchById, { 'PATCH /{id} returns status 200 or 404':  is200or404 })
    if (!isPatchByIdValid) { console.log({ failed: 'patchById', error: patchById.error, status: patchById.status, documentId: documentIdToFetch })}
    sleep(1)

    // DELETE /{id} request
    const documentIdToDelete = getListResults[randomIntBetween(0, count - 1)]._id
    const deleteById = http.del(`${CRUD_BASE_URL}/items/${documentIdToDelete}`, null,  { tags: { type: 'deleteById' }})
    const isDeleteByIdValid = check(deleteById, { 'DELETE /{id} returns status 204 or 404':  is204or404 })
    if (!isDeleteByIdValid) { console.log({ failed: 'deleteById', error: deleteById.error, status: deleteById.status, documentId: documentIdToFetch })}
    sleep(1)

    // PATCH /?_q=... request
    const counterValueForPatch = getListResults[randomIntBetween(0, count - 1)].object.counter
    const patchQuery = JSON.stringify({ 'object.counter': counterValueForPatch })
    const patch = http.patch(
    `${CRUD_BASE_URL}/items?_q=${patchQuery}`, 
    JSON.stringify({ $set: generateItem() }), 
    { 
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'patchByQuery' }
    }
    );
    check(patch, { 'PATCH / returns status 200':  is200 })
    sleep(1)
    
    // DELETE /?_q=... request
    const counterValueForDelete = getListResults[randomIntBetween(0, count - 1)].object.counter
    const deleteQuery = JSON.stringify({ 'object.counter': counterValueForDelete })
    const deleteReq = http.del(`${CRUD_BASE_URL}/items?_q=${deleteQuery}`, null,  { tags: { type: 'deleteByQuery' }}) 
    check(deleteReq, { 'DELETE / returns status 200': is200 })
    sleep(1)
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true })
    };
}
