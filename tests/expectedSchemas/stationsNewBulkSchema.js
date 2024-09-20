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
      
      module.exports = {
  "summary": "Insert new items in the stations collection.",
  "tags": [
    "stations endpoint"
  ],
  "body": {
    "operationId": "stations__MIA__postBulk__MIA__body",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "Cap": {
          "type": "number",
          "nullable": true
        },
        "CodiceMIR": {
          "type": "string",
          "nullable": true
        },
        "Comune": {
          "type": "string",
          "nullable": true
        },
        "Direttrici": {
          "type": [
            "array",
            "string",
            "null"
          ],
          "anyOf": [
            {
              "type": "array",
              "items": {
                "type": "string",
                "nullable": true
              },
              "nullable": true
            },
            {
              "type": "string",
              "nullable": true
            }
          ],
          "nullable": true
        },
        "Indirizzo": {
          "type": "string",
          "nullable": true
        },
        "country": {
          "type": "string",
          "nullable": true
        },
        "nonNullableDate": {
          "example": "1997-04-24T07:00:00.000Z",
          "type": "string",
          "nullable": false,
          "anyOf": [
            {
              "format": "date-time"
            },
            {
              "format": "date"
            },
            {
              "format": "time"
            }
          ],
          "description": "\"date-time\" according with https://tools.ietf.org/html/rfc3339#section-5.6"
        },
        "__STATE__": {
          "type": "string",
          "enum": [
            "PUBLIC",
            "DRAFT",
            "TRASH",
            "DELETED"
          ],
          "description": "The state of the document",
          "default": "DRAFT"
        }
      },
      "additionalProperties": false
    }
  },
  "response": {
    "200": {
      "operationId": "stations__MIA__postBulk__MIA__response.200",
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "_id": {
            "type": "string",
            "pattern": "^(?!\\s*$).+",
            "description": "String identifier of the document in the collection",
            "example": "00000000-0000-4000-0000-000000000000"
          }
        }
      }
    }
  }
}
        