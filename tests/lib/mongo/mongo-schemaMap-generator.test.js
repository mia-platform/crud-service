/*
 * Copyright 2023 Mia s.r.l.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const tap = require('tap')

const generateForDefinitions = require('../../../lib/mongo/mongo-schemaMap-generator')

tap.test('String encryption test', t => {
  t.test('correctly generate for searchable and enabled plain string', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'name',
        type: 'string',
        description: 'The name of the book',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'abcd' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          name: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain string', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'name',
        type: 'string',
        description: 'The name of the book',
        required: true,
        nullable: true,
      }],
    }], { books: 'abcd' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain string', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'name',
        type: 'string',
        description: 'The name of the book',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'abcd' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          name: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('Number encryption test', t => {
  t.test('correctly generate for searchable and enabled plain number', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'pages',
        type: 'number',
        description: 'Pages of the book',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'cdef' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          pages: {
            encrypt: {
              keyId: ['cdef'],
              bsonType: 'number',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain number', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'pages',
        type: 'number',
        description: 'Pages of the book',
        required: true,
        nullable: true,
      }],
    }], { books: 'cdef' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain number', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'pages',
        type: 'number',
        description: 'Pages of the book',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'cdef' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          pages: {
            encrypt: {
              keyId: ['cdef'],
              bsonType: 'number',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('Bool encryption test', t => {
  t.test('correctly throws for searchable and enabled plain bool', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'goodConditions',
        type: 'boolean',
        description: 'Is the book in good conditions',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'aaaa' }), { message: 'boolean is not searchable, only ObjectId, Date, string, number can be searched.' })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain bool', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'goodConditions',
        type: 'boolean',
        description: 'Is the book in good conditions',
        required: true,
        nullable: true,
      }],
    }], { books: 'aaaa' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain bool', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'goodConditions',
        type: 'boolean',
        description: 'Is the book in good conditions',
        required: true,
        nullable: true,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'aaaa' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          goodConditions: {
            encrypt: {
              keyId: ['aaaa'],
              bsonType: 'bool',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('Date encryption test', t => {
  t.test('correctly generate for searchable and enabled plain date', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'publishDate',
        type: 'Date',
        description: 'The date it was published',
        required: false,
        nullable: true,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'bbbb' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          publishDate: {
            encrypt: {
              keyId: ['bbbb'],
              bsonType: 'date',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain date', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'publishDate',
        type: 'Date',
        description: 'The date it was published',
        required: false,
        nullable: true,
      }],
    }], { books: 'bbbb' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain date', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'publishDate',
        type: 'Date',
        description: 'The date it was published',
        required: false,
        nullable: true,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'aaaa' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          publishDate: {
            encrypt: {
              keyId: ['aaaa'],
              bsonType: 'date',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('ObjectID encryption test', t => {
  t.test('correctly generate for searchable and enabled plain objectId', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'authorId',
        type: 'ObjectId',
        description: 'Author ID',
        required: false,
        nullable: true,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'wwww' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          authorId: {
            encrypt: {
              keyId: ['wwww'],
              bsonType: 'objectId',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain objectId', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'authorId',
        type: 'ObjectId',
        description: 'Author ID',
        required: false,
        nullable: true,
      }],
    }], { books: 'wwww' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain objectId', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'authorId',
        type: 'ObjectId',
        description: 'Author ID',
        required: false,
        nullable: true,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'wwww' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          authorId: {
            encrypt: {
              keyId: ['wwww'],
              bsonType: 'objectId',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('Array encryption test', t => {
  t.test('correctly throws for searchable and enabled plain array', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'tags',
        type: 'Array',
        items: {
          type: 'string',
        },
        description: 'Tags',
        required: false,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'cccc' }), { message: 'Array is not searchable, only ObjectId, Date, string, number can be searched.' })

    t.end()
  })

  t.test('correctly generate for searchable and disabled plain array', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'tags',
        type: 'Array',
        items: {
          type: 'string',
        },
        description: 'Tags',
        required: false,
      }],
    }], { books: 'cccc' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain array', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'tags',
        type: 'Array',
        items: {
          type: 'string',
        },
        description: 'Tags',
        required: false,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'cccc' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          tags: {
            encrypt: {
              keyId: ['cccc'],
              bsonType: 'array',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('GeoPoint encryption test', t => {
  t.test('correctly throws for searchable and enabled geopoint', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'additionalInfo',
        type: 'GeoPoint',
        required: false,
        encryption: { enabled: true, searchable: true },
      }],
    }], { books: 'pppp' }), { message: 'GeoPoint is not searchable, only ObjectId, Date, string, number can be searched.' })

    t.end()
  })

  t.test('correctly generate for searchable and disabled geopoint', t => {
    const definition = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'additionalInfo',
        type: 'GeoPoint',
        required: false,
        encryption: { enabled: false, searchable: true },
      }],
    }], { books: 'pppp' })

    t.strictSame(definition, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {},
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled geopoint', t => {
    const definition = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'additionalInfo',
        type: 'GeoPoint',
        required: false,
        encryption: { enabled: true, searchable: false },
      }],
    }], { books: 'pppp' })

    t.strictSame(definition, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          additionalInfo: {
            encrypt: {
              keyId: ['pppp'],
              bsonType: 'array',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })
  t.end()
})

tap.test('RawObject encryption test', t => {
  t.test('correctly throw for searchable and enabled plain object', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: { type: 'string' },
            other: { type: 'string' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        encryption: { enabled: true, searchable: true },
        required: false,
      }],
    }], { books: 'pppp' }), { message: 'RawObject is not searchable, only ObjectId, Date, string, number can be searched.' })

    t.end()
  })

  t.test('correctly generate for disabled plain object', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: { type: 'string' },
            other: { type: 'string' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        required: false,
      }],
    }], { books: 'pppp' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          attachments: {
            bsonType: 'object',
            properties: {},
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled plain object', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: { type: 'string' },
            other: { type: 'number' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        encryption: { enabled: true, searchable: false },
        required: false,
      }],
    }], { books: 'pppp' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          attachments: {
            encrypt: {
              keyId: ['pppp'],
              bsonType: 'object',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('All searchable fields encryption test', t => {
  t.test('correctly create configuration for all searchable fields', t => {
    const definitions = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [
        {
          name: 'name',
          type: 'string',
          description: 'The name of the book',
          required: true,
          nullable: true,
          encryption: { enabled: true, searchable: true },
        },
        {
          name: 'pages',
          type: 'number',
          description: 'Pages of the book',
          required: true,
          nullable: true,
          encryption: { enabled: true, searchable: true },
        },
        {
          name: 'publishDate',
          type: 'Date',
          description: 'The date it was published',
          required: false,
          nullable: true,
          encryption: { enabled: true, searchable: true },
        },
        {
          name: 'authorId',
          type: 'ObjectId',
          description: 'Author ID',
          required: false,
          nullable: true,
          encryption: { enabled: true, searchable: true },
        }],
    }], { books: 'abcd' })

    t.strictSame(definitions, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          name: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          pages: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'number',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          publishDate: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'date',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
          authorId: {
            encrypt: {
              keyId: ['abcd'],
              bsonType: 'objectId',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})

tap.test('Nested object encryption test', t => {
  t.test('correctly throws for searchable and enabled nested object', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: {
              type: 'object',
              properties: {
                other: { type: 'string' },
              },
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        encryption: { enabled: true, searchable: true },
        required: false,
      }],
    }], { books: 'pppp' }), { message: 'RawObject is not searchable, only ObjectId, Date, string, number can be searched.' })

    t.end()
  })

  t.test('correctly throws for unsearchable and enabled nested object with nested encryption', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: {
              type: 'object',
              properties: {
                other: { type: 'string' },
              },
              encryption: { enabled: true, searchable: true },
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        encryption: { enabled: true, searchable: false },
        required: false,
      }],
    }], { books: 'pppp' }), { message: 'An object has been wrongly configured to have some encrypted properties' })

    t.end()
  })

  t.test('correctly throws for unsearchable and enabled nested object with more nested encryption', t => {
    t.throws(() => generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: {
              type: 'object',
              properties: {
                other: {
                  type: 'object',
                  properties: {
                    otherNested: { type: 'string' },
                  },
                  encryption: { enabled: true, searchable: true },
                },
              },
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        encryption: { enabled: true, searchable: false },
        required: false,
      }],
    }], { books: 'pppp' }), { message: 'An object has been wrongly configured to have some encrypted properties' })

    t.end()
  })

  t.test('correctly generate for nested uncrypted object with nested encryption', t => {
    const definition = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: {
              type: 'object',
              properties: {
                other: { type: 'string' },
              },
              encryption: { enabled: true, searchable: false },
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        required: false,
      }],
    }], { books: 'pppp' })

    t.strictSame(definition, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          attachments: {
            bsonType: 'object',
            properties: {
              name: {
                encrypt: {
                  keyId: ['pppp'],
                  bsonType: 'object',
                  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
                },
              },
            },
          },
        },
      },
    })

    t.end()
  })

  t.test('correctly generate for unsearchable and enabled nested object with more nested encryption', t => {
    const definition = generateForDefinitions('booksDb', [{
      name: 'books',
      fields: [{
        name: 'attachments',
        type: 'RawObject',
        schema: {
          properties: {
            name: {
              type: 'object',
              properties: {
                unencryptedProperty: { type: 'string' },
                other: {
                  type: 'object',
                  properties: {
                    otherNested: { type: 'string' },
                  },
                  encryption: { enabled: true, searchable: false },
                },
              },
            },
          },
          required: ['name'],
          additionalProperties: false,
        },
        required: false,
      }],
    }], { books: 'pppp' })

    t.strictSame(definition, {
      'booksDb.books': {
        bsonType: 'object',
        properties: {
          attachments: {
            bsonType: 'object',
            properties: {
              name: {
                bsonType: 'object',
                properties: {
                  other: {
                    encrypt: {
                      keyId: ['pppp'],
                      bsonType: 'object',
                      algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    t.end()
  })

  t.end()
})
