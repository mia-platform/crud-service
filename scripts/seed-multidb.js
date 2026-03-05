#!/usr/bin/env node
/* eslint-disable no-console, no-await-in-loop, no-process-exit, id-blacklist */

/*
 * scripts/seed-multidb.js
 *
 * Populates sample data across the three multi-db scopes (rome, milan, naples).
 * Each scope gets its own MongoDB database (crud-rome, crud-milan, crud-naples)
 * with the same collections but different documents.
 *
 * Usage:
 *   node scripts/seed-multidb.js [mongoUrl]
 *
 * Default mongoUrl: mongodb://localhost:27017
 */

'use strict'

const { MongoClient, ObjectId } = require('mongodb')

const MONGO_URL = process.argv[2] || 'mongodb://localhost:27017'
const DB_PREFIX = 'crud'

const SCOPES = ['rome', 'milan', 'naples']

function ts(daysAgo = 0) {
  const dt = new Date()
  dt.setDate(dt.getDate() - daysAgo)
  return dt
}

function baseFields(creatorId = 'seed-script') {
  const now = new Date()
  return {
    updaterId: creatorId,
    updatedAt: now,
    creatorId,
    createdAt: now,
    __STATE__: 'PUBLIC',
  }
}

// ── Sample data per scope ───────────────────────────────────────

const customersByScopeCode = {
  rome: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-RM-001',
      firstName: 'Marco',
      lastName: 'Rossi',
      gender: 'M',
      birthDate: new Date('1985-03-15'),
      email: 'marco.rossi@example.com',
      subscriptionNumber: 'SUB-RM-001',
      shopID: 1,
      purchasesCount: 5,
      creditCardDetail: { name: 'Marco Rossi', cardNo: 4111111111111111, expirationDate: '12/27', cardCode: '123' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-RM-002',
      firstName: 'Giulia',
      lastName: 'Bianchi',
      gender: 'F',
      birthDate: new Date('1990-07-22'),
      email: 'giulia.bianchi@example.com',
      subscriptionNumber: 'SUB-RM-002',
      shopID: 1,
      purchasesCount: 3,
      creditCardDetail: { name: 'Giulia Bianchi', cardNo: 4222222222222222, expirationDate: '08/26', cardCode: '456' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-RM-003',
      firstName: 'Luca',
      lastName: 'Verdi',
      gender: 'M',
      birthDate: new Date('1978-11-05'),
      email: 'luca.verdi@example.com',
      subscriptionNumber: 'SUB-RM-003',
      shopID: 2,
      purchasesCount: 12,
      creditCardDetail: { name: 'Luca Verdi', cardNo: 4333333333333333, expirationDate: '03/28', cardCode: '789' },
    },
  ],
  milan: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-MI-001',
      firstName: 'Alessandro',
      lastName: 'Colombo',
      gender: 'M',
      birthDate: new Date('1992-01-10'),
      email: 'alessandro.colombo@example.com',
      subscriptionNumber: 'SUB-MI-001',
      shopID: 3,
      purchasesCount: 7,
      creditCardDetail: { name: 'Alessandro Colombo', cardNo: 4444444444444444, expirationDate: '11/27', cardCode: '321' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-MI-002',
      firstName: 'Francesca',
      lastName: 'Ferrari',
      gender: 'F',
      birthDate: new Date('1988-09-30'),
      email: 'francesca.ferrari@example.com',
      subscriptionNumber: 'SUB-MI-002',
      shopID: 3,
      purchasesCount: 2,
      creditCardDetail: { name: 'Francesca Ferrari', cardNo: 4555555555555555, expirationDate: '06/29', cardCode: '654' },
    },
  ],
  naples: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-NA-001',
      firstName: 'Antonio',
      lastName: 'Esposito',
      gender: 'M',
      birthDate: new Date('1975-06-18'),
      email: 'antonio.esposito@example.com',
      subscriptionNumber: 'SUB-NA-001',
      shopID: 5,
      purchasesCount: 20,
      creditCardDetail: { name: 'Antonio Esposito', cardNo: 4666666666666666, expirationDate: '01/26', cardCode: '111' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-NA-002',
      firstName: 'Maria',
      lastName: 'Russo',
      gender: 'F',
      birthDate: new Date('1995-12-03'),
      email: 'maria.russo@example.com',
      subscriptionNumber: 'SUB-NA-002',
      shopID: 5,
      purchasesCount: 1,
      creditCardDetail: { name: 'Maria Russo', cardNo: 4777777777777777, expirationDate: '09/27', cardCode: '222' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-NA-003',
      firstName: 'Giuseppe',
      lastName: 'Romano',
      gender: 'M',
      birthDate: new Date('1982-04-25'),
      email: 'giuseppe.romano@example.com',
      subscriptionNumber: 'SUB-NA-003',
      shopID: 6,
      purchasesCount: 8,
      creditCardDetail: { name: 'Giuseppe Romano', cardNo: 4888888888888888, expirationDate: '04/28', cardCode: '333' },
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      customerId: 'CUST-NA-004',
      firstName: 'Sara',
      lastName: 'Colombo',
      gender: 'F',
      birthDate: new Date('2000-08-14'),
      email: 'sara.colombo@example.com',
      subscriptionNumber: 'SUB-NA-004',
      shopID: 6,
      purchasesCount: 0,
      creditCardDetail: { name: 'Sara Colombo', cardNo: 4999999999999999, expirationDate: '07/30', cardCode: '444' },
    },
  ],
}

const itemsByScopeCode = {
  rome: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Colosseum Tour Pass',
      price: 45.00,
      category: 'tourism',
      createdAt: ts(10),
      updatedAt: ts(10),
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Roma Metro Card',
      price: 7.00,
      category: 'transport',
      createdAt: ts(5),
      updatedAt: ts(5),
    },
  ],
  milan: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Duomo Ticket',
      price: 15.00,
      category: 'tourism',
      createdAt: ts(8),
      updatedAt: ts(8),
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Navigli Boat Ride',
      price: 25.00,
      category: 'tourism',
      createdAt: ts(3),
      updatedAt: ts(3),
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Milano Metro Pass',
      price: 4.50,
      category: 'transport',
      createdAt: ts(1),
      updatedAt: ts(1),
    },
  ],
  naples: [
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Pompei Day Trip',
      price: 60.00,
      category: 'tourism',
      createdAt: ts(12),
      updatedAt: ts(12),
    },
    {
      _id: new ObjectId(),
      ...baseFields(),
      name: 'Pizza Cooking Class',
      price: 35.00,
      category: 'food',
      createdAt: ts(2),
      updatedAt: ts(2),
    },
  ],
}

// ── Main ────────────────────────────────────────────────────────

async function seed() {
  const client = new MongoClient(MONGO_URL)
  try {
    await client.connect()
    console.log(`Connected to ${MONGO_URL}`)

    for (const scope of SCOPES) {
      const dbName = `${DB_PREFIX}-${scope}`
      const db = client.db(dbName)

      // Drop existing collections to allow re-seeding
      const existing = await db.listCollections().toArray()
      for (const coll of existing) {
        await db.dropCollection(coll.name)
      }

      // Insert customers
      const customers = customersByScopeCode[scope]
      if (customers && customers.length > 0) {
        await db.collection('customers').insertMany(customers)
        console.log(`  ${dbName}.customers → ${customers.length} documents`)
      }

      // Insert items
      const items = itemsByScopeCode[scope]
      if (items && items.length > 0) {
        await db.collection('items').insertMany(items)
        console.log(`  ${dbName}.items → ${items.length} documents`)
      }

      console.log(`✓ ${dbName} seeded`)
    }

    console.log('\nDone! Databases seeded:')
    for (const scope of SCOPES) {
      console.log(`  - ${DB_PREFIX}-${scope}`)
    }
  } finally {
    await client.close()
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
