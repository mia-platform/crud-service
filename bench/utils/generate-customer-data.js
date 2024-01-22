/* eslint-disable no-console */
'use strict'

const { Command } = require('commander')
const { MongoClient } = require('mongodb')
const { faker } = require('@faker-js/faker')

const { version } = require('../../package.json')

function generateCustomers({ index, shopCount }) {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()

  const fullNameCode = `${firstName}.${lastName}`
  // email is generated manually to ensure unicity
  const email = `${fullNameCode}.${faker.number.int({ max: 99 })}@email.com`

  const creditCardDetail = {
    name: `${firstName} ${lastName}`,
    cardNo: faker.finance.creditCardNumber(),
    expirationDate: `${faker.number.int({ min: 1, max: 12 })}/${faker.number.int({ min: 2024, max: 2031 })}`,
    cvv: faker.finance.creditCardCVV,
  }

  const address = {
    line: faker.location.street(),
    city: faker.location.city(),
    county: faker.location.county(),
    country: faker.location.country(),
  }

  const socialNetworkProfiles = {
    twitter: `http://www.xcom/${fullNameCode}`,
    instagram: `http://www.instagram.com/${fullNameCode}`,
    facebook: `http://www.facebook.com/${fullNameCode}`,
    threads: `http://www.threads.com/@${fullNameCode}`,
    reddit: `http://www.reddit.com/u/${fullNameCode}`,
    linkedin: `http://www.linked.in/${fullNameCode}`,
    tiktok: `http://www.tiktok.co/${fullNameCode}`,
  }

  const purchasesCount = faker.number.int({ min: 1, max: 51 })
  const purchases = []
  for (let i = 0; i < purchasesCount; i++) {
    purchases.push({
      name: faker.commerce.productName(),
      category: faker.commerce.department(),
      price: faker.commerce.price({ min: '1', symbol: '$' }),
      employeeId: faker.number.int({ min: 1, max: shopCount * 10 }),
      boughtOnline: faker.datatype.boolean(0.2),
    })
  }

  return {
    updaterId: faker.string.uuid(),
    updatedAt: faker.date.recent(),
    creatorId: faker.string.uuid(),
    createdAt: faker.date.past(),
    __STATE__: 'PUBLIC',
    customerId: index,
    firstName,
    lastName,
    gender: faker.person.gender(),
    birthDate: faker.date.birthdate(),
    creditCardDetail,
    canBeContacted: faker.datatype.boolean(0.9),
    email,
    phoneNumber: faker.phone.number(),
    address,
    socialNetworkProfiles,
    subscriptionNumber: faker.finance.creditCardNumber(),
    shopID: faker.number.int({ min: 1, max: shopCount }),
    purchasesCount,
    purchases,
    detail: faker.hacker.phrase(),
  }
}

async function generateData(options) {
  const {
    connectionString = 'mongodb://localhost:27017',
    database = 'benchTest',
    numDocumentsToCreate = 100000,
    shopCount = 250,
  } = options
  // #region constants
  const customerCollectionName = 'customers'
  const customerBatchSize = numDocumentsToCreate / 10
  // #endregion

  const mongo = new MongoClient(connectionString)
  await mongo.connect()

  const coll = mongo.db(database).collection(customerCollectionName)

  try {
    let i = numDocumentsToCreate
    while (i > 0) {
      process.stdout.write(`\rStarting the creation of documents for collection "customers".`)
      const numberToGenerate = Math.min(customerBatchSize, i)

      const users = []
      for (let j = 0; j < numberToGenerate; j++) {
        users.push(generateCustomers({ index: j + i, shopCount }))
      }

      // eslint-disable-next-line no-await-in-loop
      await coll.insertMany(users)

      i -= numberToGenerate
      process.stdout.write(`\r(${numDocumentsToCreate - i}/${numDocumentsToCreate}) ${((numDocumentsToCreate - i) / numDocumentsToCreate * 100).toFixed(2)}%`)
    }
  } catch (error) {
    console.error(`failed to generate data: ${error}`)
  } finally {
    await mongo.close()
  }
}

async function main() {
  const program = new Command()

  program.version(version)

  program
    .option('-c, --connection-string <string>', 'MongoDB connection string')
    .option('-d, --database <database>', 'MongoDB database name')
    .option('-n, --number <number>', 'Number of documents to generate')
    .option('-s, --shopCount <string>', 'Number of shops to be used inside the "shopID" field inside each database document')
    .action(generateData)

  await program.parseAsync()
}

if (require.main === module) {
  main()
    .then(() => {
      console.info(`\n\n 🦋 records successfully created\n`)
      process.exitCode = 0
    })
    .catch(error => {
      console.error(`\n ❌ failed to create records ${error.message}\n`)
      process.exitCode = 1
    })
}
