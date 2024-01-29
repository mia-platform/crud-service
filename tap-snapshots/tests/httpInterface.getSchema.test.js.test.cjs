/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`tests/httpInterface.getSchema.test.js > TAP > getSchemas > must match snapshot 1`] = `
Object {
  "properties": Object {
    "__STATE__": Object {
      "description": "The state of the document",
      "type": "string",
    },
    "_id": Object {
      "description": "Hexadecimal identifier of the document in the collection",
      "example": "000000000000000000000000",
      "pattern": "^[a-fA-F\\\\d]{24}$",
      "type": "string",
    },
    "additionalInfo": Object {
      "additionalProperties": true,
      "nullable": true,
      "type": "object",
    },
    "attachments": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "additionalProperties": false,
            "nullable": true,
            "properties": Object {
              "additionalInfo": Object {
                "additionalProperties": true,
                "type": "object",
              },
              "detail": Object {
                "properties": Object {
                  "size": Object {
                    "type": "number",
                  },
                },
                "type": "object",
              },
              "more": Object {
                "items": Object {
                  "type": "string",
                },
                "type": "array",
              },
              "name": Object {
                "type": "string",
              },
              "neastedArr": Object {
                "items": Object {
                  "type": "number",
                },
                "type": "array",
              },
              "other": Object {
                "type": "string",
              },
              "size": Object {
                "type": "number",
              },
              "stuff": Object {
                "type": "number",
              },
            },
            "required": Array [
              "name",
            ],
            "type": "object",
          },
          "nullable": true,
          "type": "array",
        },
        Object {
          "additionalProperties": false,
          "nullable": true,
          "properties": Object {
            "additionalInfo": Object {
              "additionalProperties": true,
              "type": "object",
            },
            "detail": Object {
              "properties": Object {
                "size": Object {
                  "type": "number",
                },
              },
              "type": "object",
            },
            "more": Object {
              "items": Object {
                "type": "string",
              },
              "type": "array",
            },
            "name": Object {
              "type": "string",
            },
            "neastedArr": Object {
              "items": Object {
                "type": "number",
              },
              "type": "array",
            },
            "other": Object {
              "type": "string",
            },
            "size": Object {
              "type": "number",
            },
            "stuff": Object {
              "type": "number",
            },
          },
          "required": Array [
            "name",
          ],
          "type": "object",
        },
      ],
      "nullable": true,
      "type": Array [
        "null",
        "array",
        "object",
      ],
    },
    "author": Object {
      "description": "The author of the book",
      "type": "string",
    },
    "authorAddressId": Object {
      "description": "The address of the author",
      "example": "000000000000000000000000",
      "pattern": "^[a-fA-F\\\\d]{24}$",
      "type": "string",
    },
    "createdAt": Object {
      "description": "Date of the request that has performed the object creation",
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": false,
      "type": "string",
    },
    "creatorId": Object {
      "description": "User id that has created this object",
      "type": "string",
    },
    "editionsDates": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "additionalProperties": true,
            "nullable": true,
            "properties": Object {
              "date": Object {
                "format": "date-time",
                "type": "string",
              },
              "edition": Object {
                "type": "number",
              },
            },
            "type": "object",
          },
          "nullable": true,
          "type": "array",
        },
        Object {
          "additionalProperties": true,
          "nullable": true,
          "properties": Object {
            "date": Object {
              "format": "date-time",
              "type": "string",
            },
            "edition": Object {
              "type": "number",
            },
          },
          "type": "object",
        },
      ],
      "nullable": true,
      "type": Array [
        "null",
        "array",
        "object",
      ],
    },
    "isbn": Object {
      "description": "The isbn code",
      "type": "string",
    },
    "isPromoted": Object {
      "description": "If it's in promotion",
      "type": "boolean",
    },
    "metadata": Object {
      "additionalProperties": false,
      "properties": Object {
        "exampleArrayOfArray": Object {
          "items": Object {
            "items": Object {
              "type": "string",
            },
            "type": "array",
          },
          "type": "array",
        },
        "somethingArrayObject": Object {
          "items": Object {
            "additionalProperties": true,
            "properties": Object {
              "anotherNumber": Object {
                "type": "number",
              },
              "anotherObject": Object {
                "nullable": true,
                "type": "object",
              },
              "arrayItemObjectChildNumber": Object {
                "type": "number",
              },
            },
            "required": Array [
              "arrayItemObjectChildNumber",
            ],
            "type": "object",
          },
          "type": "array",
        },
        "somethingArrayOfNumbers": Object {
          "items": Object {
            "type": "number",
          },
          "type": "array",
        },
        "somethingNumber": Object {
          "type": "number",
        },
        "somethingObject": Object {
          "additionalProperties": true,
          "properties": Object {
            "childNumber": Object {
              "type": "number",
            },
          },
          "type": "object",
        },
        "somethingString": Object {
          "type": "string",
        },
      },
      "required": Array [
        "somethingNumber",
      ],
      "type": "object",
    },
    "name": Object {
      "description": "The name of the book",
      "nullable": true,
      "type": "string",
    },
    "position": Object {
      "description": "The position of the book",
      "items": Object {
        "type": "number",
      },
      "type": "array",
    },
    "price": Object {
      "description": "The price of the book",
      "type": "number",
    },
    "publishDate": Object {
      "description": "The date it was published",
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": true,
      "type": "string",
    },
    "signature": Object {
      "additionalProperties": true,
      "nullable": true,
      "properties": Object {
        "name": Object {
          "type": "string",
        },
      },
      "required": Array [
        "name",
      ],
      "type": "object",
    },
    "tagIds": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "type": "number",
          },
          "type": "array",
        },
        Object {
          "type": "number",
        },
      ],
      "description": "Tag identification numbers",
      "type": Array [
        "array",
        "number",
      ],
    },
    "tags": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "type": "string",
          },
          "type": "array",
        },
        Object {
          "type": "string",
        },
      ],
      "description": "Tags",
      "type": Array [
        "array",
        "string",
      ],
    },
    "updatedAt": Object {
      "description": "Date of the request that has performed the last change",
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": false,
      "type": "string",
    },
    "updaterId": Object {
      "description": "User id that has requested the last change successfully",
      "type": "string",
    },
  },
  "type": "object",
}
`
