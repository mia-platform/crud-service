'use strict'

import http from 'k6/http';
import { check, sleep } from 'k6';

/** Base URL of the CRUD Service instance deployed via `/bench/docker-compose.yml */
export const CRUD_BASE_URL = 'http://crud-service:3000'

/** Returns `true` if the response have status 200. Can be used in any GET returning results. */
export const is200 = res => res.status === 200
/** Returns `true` if the response have status 200 or 404. Can be used for requests by id */
export const is200or404 = res => [200, 404].includes(res.status)
/** Returns `true` if the response have status 204 or 404. Can be used for the `DELETE \{id}` requests */
export const is204or404 = res => [204, 404].includes(res.status)

/**
 * Execute the following GET requests:
 * - `GET /`: returns a list of documents from the collection filtered by a specified queryString
 * - `GET /{id}`: returns a document with given id (this Id is found)
 * - `GET /?_q=...`: returns a list of documents that satisfy the condition in the `_q` operator passed in queryString
 * - `GET /count`: count the documents in the collection that satisfy the condition specified in the queryString
 * - `GET /export`: request to export data from the collection filtered by a specified queryString
 * 
 * @param {string} collectionName Name of the collection to execute the request in
 * @param {object} options The following object includes a list of queries to be used for the different GET requests, and the time to pass between each request (in ms - default: 0.1ms).
 * Queries have default values, but can be modified at will (in that case, refer to the property names to understand which request will be affected) 
 */
export const executeGetTests = (
  collectionName,
  {
    getListQueryString = 'shopID=2',
    getWithQueryOperatorQueryString = JSON.stringify({ purchasesCount: { $gte: 100 }}),
    getCountQueryString = 'canBeContacted=true',
    getExportQueryString = 'shopID=2',
    sleepTime = 0.1
  } = {}
) => {
  // GET / request
  const getList = http.get(`${CRUD_BASE_URL}/${collectionName}?${getListQueryString}`, { tags: { type: 'getList' }})
  check(getList, { 'GET / returns status 200': is200 })
  sleep(sleepTime)

  // Fetch for the seventh document from the getList request to get an id to use for a getById request
  const getListResults = JSON.parse(getList.body)
  const count = getListResults.length
  const document = getListResults[7 % count]

  if (document) {
      // GET /{id} request
      const getById = http.get(`${CRUD_BASE_URL}/${collectionName}/${document._id}`, { tags: { type: 'getById' }})
      check(getById, { 'GET/{id} returns status 200': is200 })
      sleep(sleepTime)
  }

  // GET /_q=... request
  const getWithQuery = http.get(`${CRUD_BASE_URL}/${collectionName}/?_q=${getWithQueryOperatorQueryString}`, { tags: { type: 'getListWithQueryOperator' }})
  check(getWithQuery, { 'GET /?_q=... returns status 200': is200 })
  sleep(sleepTime)

  // GET /count request
  const getCount = http.get(`${CRUD_BASE_URL}/${collectionName}/count?${getCountQueryString}`,  { tags: { type: 'count' }})
  check(getCount, { 'GET /count returns status 200': is200 })
  sleep(sleepTime)

  // GET /export request
  const getExport = http.get(`${CRUD_BASE_URL}/${collectionName}/export?${getExportQueryString}`,  { tags: { type: 'export' }})
  check(getExport, { 'GET /export returns status 200': is200 })
  sleep(sleepTime)
}
