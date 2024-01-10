/* eslint-disable no-console */
'use strict'

const { Command } = require('commander')
const { MongoClient } = require('mongodb')
const { faker } = require('@faker-js/faker')

const { version, description } = require('./package.json')

async function main() {
  const program = new Command()

  program.version(version)

  program
    .description(description)
    .requiredOption('-c, --connection-string <string>', 'MongoDB connection string')
    .requiredOption('-d, --database <database>', 'MongoDB database name')
    .requiredOption('-cl, --collection <collection>', 'MongoDB collection name')
    .option('-s, --shop-ids <number>', 'number of shop identifiers', '5')
    .option('-u, --users <number>', 'number of users to generate and split across the different shop-ids', '500000')
    .option('-b, --batch-size <number>', 'number of records inserted per batch', '1000')
    .action(generateData)

  await program.parseAsync()
}

async function generateData(options) {
  const {
    connectionString,
    database,
    collection,
    shopIds: rawShopIds,
    users: rawUsers,
    batchSize: rawBatchSize,
  } = options

  const shopIds = Math.max(Number.parseInt(rawShopIds), 1)
  const numUsers = Math.max(Number.parseInt(rawUsers), 10)
  const batchSize = Math.max(Number.parseInt(rawBatchSize), 10)

  const mongo = new MongoClient(connectionString)
  await mongo.connect()

  const coll = mongo.db(database).collection(collection)

  try {
    let i = numUsers
    while (i > 0) {
      const numberToGenerate = Math.min(batchSize, i)

      const users = []
      for (let j = 0; j < numberToGenerate; j++) {
        users.push(getUser(shopIds))
      }

      // eslint-disable-next-line no-await-in-loop
      await coll.insertMany(users)

      i -= numberToGenerate
      process.stdout.write(`\r(${numUsers - i}/${numUsers}) ${((numUsers - i) / numUsers * 100).toFixed(2)}%`)
    }
  } catch (error) {
    console.error(`failed to generate data: ${error}`)
  } finally {
    await mongo.close()
  }
}

function getUser(shopIds) {
  return {
    updaterId: faker.string.uuid(),
    updatedAt: faker.date.recent(),
    creatorId: faker.string.uuid(),
    createdAt: faker.date.past(),
    __STATE__: 'PUBLIC',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    birthDate: faker.date.birthdate(),
    bio: faker.hacker.phrase(),
    shopID: faker.number.int({ min: 1, max: shopIds }),
    subscriptionNumber: faker.finance.creditCardNumber(),
    purchases: faker.number.int({ min: 1, max: 451 }),
    happy: faker.datatype.boolean(0.88),
  }
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
