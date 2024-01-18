'use strict'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const CRUD_BASE_URL = 'http://crud-service:3000'

export const is200 = res => res.status === 200
export const is204 = res => res.status === 204
export const is200or404 = res => [200, 404].includes(res.status)
export const is204or404 = res => [204, 404].includes(res.status)

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
  const getLitResults = JSON.parse(getList.body)
  const count = getLitResults.length
  const document = getLitResults[7 % count]

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
