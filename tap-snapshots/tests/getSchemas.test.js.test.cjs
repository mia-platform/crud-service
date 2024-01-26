/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`tests/getSchemas.test.js > TAP > getSchemas > must match snapshot 1`] = `
Object {
  "address-statistics": Object {
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
    "addressId": Object {
      "description": "The address to refer to",
      "example": "000000000000000000000000",
      "pattern": "^[a-fA-F\\\\d]{24}$",
      "type": "string",
    },
    "count": Object {
      "description": "--",
      "type": "number",
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
    "tag": Object {
      "description": "The tag",
      "type": "string",
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
  "addresses": Object {
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
    "displayName": Object {
      "description": "The display name",
      "type": "string",
    },
    "house_number": Object {
      "description": "The number of the house",
      "type": "string",
    },
    "street": Object {
      "description": "The street of the house",
      "type": "string",
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
  "animals": Object {
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
    "family": Object {
      "type": "string",
    },
    "name": Object {
      "type": "string",
    },
    "specie": Object {
      "type": "string",
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
    "weight": Object {
      "type": "number",
    },
  },
  "books": Object {
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
        "array",
        "object",
        "null",
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
        "array",
        "object",
        "null",
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
  "books-encrypted": Object {
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
      "type": "object",
    },
    "attachments": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "additionalProperties": false,
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
          "type": "array",
        },
        Object {
          "additionalProperties": false,
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
      "type": Array [
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
            "type": "object",
          },
          "type": "array",
        },
        Object {
          "additionalProperties": true,
          "type": "object",
        },
      ],
      "type": Array [
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
          "encryption": Object {
            "enabled": true,
            "searchable": false,
          },
          "properties": Object {
            "childNumber": Object {
              "type": "number",
            },
          },
          "type": "object",
        },
        "somethingString": Object {
          "encryption": Object {
            "enabled": true,
            "searchable": true,
          },
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
  "canines": Object {
    "__STATE__": Object {
      "description": "The state of the document",
      "type": "string",
    },
    "_id": Object {
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
    "name": Object {
      "type": "string",
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
    "weight": Object {
      "type": "number",
    },
  },
  "cars": Object {
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
      "type": "object",
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
    "name": Object {
      "description": "The car's name",
      "type": "string",
    },
    "position": Object {
      "description": "The car's position",
      "items": Object {
        "type": "number",
      },
      "type": "array",
    },
    "price": Object {
      "description": "The car's price",
      "type": "number",
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
  "felines": Object {
    "__STATE__": Object {
      "description": "The state of the document",
      "type": "string",
    },
    "_id": Object {
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
    "name": Object {
      "type": "string",
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
    "weight": Object {
      "type": "number",
    },
  },
  "films": Object {
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
    "episode_id": Object {
      "description": "The number of the episode",
      "type": "number",
    },
    "title": Object {
      "description": "The Title of the episode",
      "type": "string",
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
  "items": Object {
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
    "name": Object {
      "type": "string",
    },
    "rating": Object {
      "nullable": true,
      "type": "number",
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
  "orders": Object {
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
    "id_rider": Object {
      "description": "The id of the rider who will deliver the items",
      "example": "000000000000000000000000",
      "pattern": "^[a-fA-F\\\\d]{24}$",
      "type": "string",
    },
    "items": Object {
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
      "description": "The id of items to deliver to the customer",
      "type": Array [
        "array",
        "string",
      ],
    },
    "paid": Object {
      "description": "Whether the order has been payed",
      "nullable": true,
      "type": "boolean",
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
  "orders-details": Object {
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
    "items": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "description": "Hexadecimal identifier of the document in the collection",
            "example": "000000000000000000000000",
            "pattern": "^[a-fA-F\\\\d]{24}$",
            "type": "string",
          },
          "type": "array",
        },
        Object {
          "description": "Hexadecimal identifier of the document in the collection",
          "example": "000000000000000000000000",
          "pattern": "^[a-fA-F\\\\d]{24}$",
          "type": "string",
        },
      ],
      "description": "The item to deliver to the customer",
      "type": Array [
        "array",
        "string",
      ],
    },
    "paid": Object {
      "description": "Whether the order has been payed",
      "nullable": true,
      "type": "boolean",
    },
    "rider": Object {
      "additionalProperties": true,
      "properties": Object {
        "label": Object {
          "type": "string",
        },
        "value": Object {
          "__mia_configuration": Object {
            "type": "ObjectId",
          },
          "type": "string",
        },
      },
      "type": "object",
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
  "orders-items": Object {
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
    "items": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "additionalProperties": true,
            "nullable": true,
            "properties": Object {
              "label": Object {
                "type": "string",
              },
              "value": Object {
                "type": "string",
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
            "label": Object {
              "type": "string",
            },
            "value": Object {
              "type": "string",
            },
          },
          "type": "object",
        },
      ],
      "nullable": true,
      "type": Array [
        "array",
        "object",
        "null",
      ],
    },
    "paid": Object {
      "description": "Whether the order has been payed",
      "nullable": true,
      "type": "boolean",
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
  "people": Object {
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
    "films": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "description": "Hexadecimal identifier of the document in the collection",
            "example": "000000000000000000000000",
            "pattern": "^[a-fA-F\\\\d]{24}$",
            "type": "string",
          },
          "type": "array",
        },
        Object {
          "description": "Hexadecimal identifier of the document in the collection",
          "example": "000000000000000000000000",
          "pattern": "^[a-fA-F\\\\d]{24}$",
          "type": "string",
        },
      ],
      "description": "Films where the guy appears",
      "type": Array [
        "array",
        "string",
      ],
    },
    "height": Object {
      "description": "The height of the guy",
      "type": "number",
    },
    "name": Object {
      "description": "The name of the guy",
      "type": "string",
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
  "projects": Object {
    "__STATE__": Object {
      "description": "__STATE__",
      "type": "string",
    },
    "_id": Object {
      "description": "_id",
      "example": "000000000000000000000000",
      "pattern": "^[a-fA-F\\\\d]{24}$",
      "type": "string",
    },
    "createdAt": Object {
      "description": "createdAt",
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": false,
      "type": "string",
    },
    "creatorId": Object {
      "description": "creatorId",
      "type": "string",
    },
    "environments": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "additionalProperties": true,
            "properties": Object {
              "dashboards": Object {
                "items": Object {
                  "additionalProperties": true,
                  "properties": Object {
                    "id": Object {
                      "type": "string",
                    },
                    "label": Object {
                      "type": "string",
                    },
                    "url": Object {
                      "type": "string",
                    },
                  },
                  "type": "object",
                },
                "type": "array",
              },
              "envId": Object {
                "type": "string",
              },
              "label": Object {
                "type": "string",
              },
              "value": Object {
                "type": "string",
              },
            },
            "type": "object",
          },
          "type": "array",
        },
        Object {
          "additionalProperties": true,
          "properties": Object {
            "dashboards": Object {
              "items": Object {
                "additionalProperties": true,
                "properties": Object {
                  "id": Object {
                    "type": "string",
                  },
                  "label": Object {
                    "type": "string",
                  },
                  "url": Object {
                    "type": "string",
                  },
                },
                "type": "object",
              },
              "type": "array",
            },
            "envId": Object {
              "type": "string",
            },
            "label": Object {
              "type": "string",
            },
            "value": Object {
              "type": "string",
            },
          },
          "type": "object",
        },
      ],
      "type": Array [
        "array",
        "object",
      ],
    },
    "name": Object {
      "description": "The name of the project",
      "type": "string",
    },
    "updatedAt": Object {
      "description": "updatedAt",
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": false,
      "type": "string",
    },
    "updaterId": Object {
      "description": "updaterId",
      "type": "string",
    },
  },
  "riders": Object {
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
    "name": Object {
      "type": "string",
    },
    "surname": Object {
      "type": "string",
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
  "stations": Object {
    "__STATE__": Object {
      "description": "The state of the document",
      "type": "string",
    },
    "_id": Object {
      "description": "_id",
      "type": "string",
    },
    "Cap": Object {
      "nullable": true,
      "type": "number",
    },
    "CodiceMIR": Object {
      "nullable": true,
      "type": "string",
    },
    "Comune": Object {
      "nullable": true,
      "type": "string",
    },
    "country": Object {
      "nullable": true,
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
    "Direttrici": Object {
      "anyOf": Array [
        Object {
          "items": Object {
            "nullable": true,
            "type": "string",
          },
          "nullable": true,
          "type": "array",
        },
        Object {
          "nullable": true,
          "type": "string",
        },
      ],
      "nullable": true,
      "type": Array [
        "array",
        "string",
        "null",
      ],
    },
    "Indirizzo": Object {
      "nullable": true,
      "type": "string",
    },
    "nonNullableDate": Object {
      "example": "1997-04-24T07:00:00.000Z",
      "nullable": false,
      "type": "string",
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
  "store": Object {
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
    "address": Object {
      "description": "The complete address of the store",
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
    "currentlyWorking": Object {
      "description": "Whether the store is open or not",
      "type": "boolean",
    },
    "managerId": Object {
      "description": "Identifier of the manager",
      "type": "string",
    },
    "name": Object {
      "description": "The name of the store",
      "type": "string",
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
  "store-open": Object {
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
    "address": Object {
      "description": "The complete address of the store",
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
    "name": Object {
      "description": "The name of the store",
      "type": "string",
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
}
`
