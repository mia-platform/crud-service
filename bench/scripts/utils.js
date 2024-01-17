'use strict'

const CRUD_BASE_URL = 'http://localhost:3000'

const is200 = res => res.status === 200

module.exports = { CRUD_BASE_URL, is200 }
