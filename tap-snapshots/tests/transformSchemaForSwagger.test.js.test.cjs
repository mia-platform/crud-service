/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports['tests/transformSchemaForSwagger.test.js TAP transformSchemaForSwagger remove unique id from schema > must match snapshot 1'] = `
{
  "summary": "Update an item of the books collection by ID",
  "tags": [
    "Books Endpoint"
  ],
  "params": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "the doc _id"
      }
    }
  },
  "body": {
    "type": "object",
    "properties": {
      "foo": {
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  "querystring": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "The name of the book"
      }
    },
    "patternProperties": {
      "metadata\\\\.somethingArrayObject\\\\.\\\\d+\\\\..+$$": true
    },
    "additionalProperties": false
  },
  "response": {
    "200": {
      "type": "object",
      "properties": {
        "_id": {
          "type": "string",
          "examples": [
            "000000000000000000000000"
          ],
          "pattern": "^[a-fA-F\\\\d]{24}$",
          "description": "Hexadecimal identifier of the document in the collection"
        }
      }
    }
  }
}
`
