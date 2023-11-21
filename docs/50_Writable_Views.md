# Writable Views

:::danger
This feature requires at least MongoDB with version higher than 4.4
:::

## Introduction

Let's suppose we would like to model the delivery _orders_ issued by a restaurant, where each of them has its own _rider_ associated. Depending on your solution needs, it could be possible to either:

- model both information into a single MongoDB collection
- split orders details from riders, store them each in their corresponding collections and merge them later using a MongoDB view.

Focusing on the latter solution, usually it is achieved by saving in one collection's records a reference to records of the other collection. This reference can be the `ObjectId`. Considering our example, each order record may contain a rider identifier, which can be employed to retrieve further rider's data.

For example, these are two records matching above description, one per collection:

```json title=Orders
{
   "_id": "6554e9eedf0efad9177c8212",
   "date": "2023-11-17T14:17:08.770Z",
   "totalAmount": 12.50,
   "items": [
      // ...
   ],
   "riderId": "65576e773a7e5c988fee1084" // rider ObjectId
}
```

```json title=Riders
{
   "_id": "65576e773a7e5c988fee1084",
   "firstName": "Frodo",
   "lastName": "Baggins",
   "ordersDelivered": 1,
   "tipPercent": 13,
   "transportationMean": "eagle"
}
```

In order to access those data aggregated, one may define the following MongoDB aggregation as a view pipeline:

```json title=Aggregation Pipeline
[
   {
      "$lookup": {
         "from": "riders",
         "localField": "riderId",
         "foreignField": "_id",
         "as": "rider",
         "pipeline": [
            {
               "$project": {
                  "_id": 0
               }
            }
         ]
      }
   },
   {
      "$unwind": {
         "path": "$rider",
         "preserveNullAndEmptyArrays": true
      }
   },
   {
      "$project": {
         "riderId": 0
      }
   }
]
```

resulting in the following aggregated record:

```json title=Order Details
{
   "_id": "6554e9eedf0efad9177c8212",
    "date" : "2023-11-17T14:17:08.770Z",
    "totalAmount" : 12.5,
    "items" : [
      // ...
    ],
    "rider" : {
        "firstName" : "Frodo",
        "lastName" : "Baggins",
        "ordersDelivered" : 1.0,
        "tipPercent" : 13.0,
        "transportationMean" : "eagle"
    }
}
```

This looks great in case your application just need to visualize those data aggregated. However,
it poses a limitation whenever it is necessary to add, edit or delete references between the two collections. In fact, applications using CRUD Service would require to call the source collection endpoint, which adopts a different data model, leading to duplicate the logic to read and change object references.

---

## Overview

To address the problem mentioned in the previous section, CRUD Service provides a feature called _writable views_. This type of views are **limited** on what can actually be written back to the source collection and they require the adoption a specific format for lookup fields. However, the benefit is that they allow to **change lookup references** on the source collection using the same interface of the view endpoint.

_Writable views_ feature can be enabled per CRUD Service view by setting the property `enableLookup` to `true` in the view definition model. This allows the service to expose further `POST`, `PATCH`, and `DELETE` routes in addition to a view existing `GET` endpoints. These new routes gives the caller the possibility to add, change or delete records on the source collection using the view data model. In particular:

- `POST`: allow adding a new record on the source collection
- `PATCH`: allows editing the lookup fields on the source collection
- `DELETE`: allow removing an existing record from the source collection

Please note that there are a few **limitations**, that will be briefly discussed.

Moreover, CRUD service exposes an additional route for each `$lookup` step found in the **first-level** of view's aggregation pipeline. Accessing these routes, denoted as `/lookup/<name of the view field>`, provides access the records coming from the _lookup_ collection, so that it is possible to list all the values (`ObjectId`) that can be assigned to that particular lookup field.  
Please note that resulting records are returned adopting the same format specified in the lookup pipeline.

## Limitations

Before enabling this feature on a CRUD Service view it important to consider the following limitations:

- view aggregation pipeline must have at least one `$lookup` step in the view pipeline. On the contrary the feature would not be useful, since there would not be any reference to other collection to be edited;  

- it is specifically designed for collections with **one-to-one** or **one-to-many** relationships that have a **single level of depth**; 

  :::caution This feature is **not** intended for collections with multiple levels of depth in their relationships. :::  

- `$lookup` steps must have an aggregation pipeline that return an object containing at least the `value` property, which would be set to the `ObjectId` of the found record on the destination collection. This property would act as a [foreign key](https://en.wikipedia.org/wiki/Foreign_key). An example of output could be the following one:
   ```json
   {
     "value": "65576e773a7e5c988fee1084", // rider identifier
     "label": "Bilbo Baggins"             // additional fields that are employed to show a record preview
   }
   ```  

- CRUD Service schema should be respected, and therefore additional fields must use the casting operators made available by MongoDB to convert fields into the expected type. Available operators are:
   - `$toBool`
   - `$toDate`
   - `$toDecimal`
   - `$toDouble`
   - `$toInt`
   - `$toLong`
   - `$toObjectId`
   - `$toString`  

- `POST` operation can be successfully carried out only when a view definition matches the schema of _underlying_ source collection in all fields except for _lookup_ ones.  

- `PATCH` operation is designed for changing lookup references. In all the other cases it falls back to the same limitation of `POST` operation.  

- `DELETE` operation can be carried out without limitations on the source collection, but it does **not** perform a cascade delete. In fact, only the record on the source collection would be removed, but referenced records on the _lookup_ should be manually deleted with their collection endpoint.

# Configuration Examples

To enable this feature for a specific view, it is necessary to set the `enableLookup` flag to `true` within its definition. By default, this property is set to `false`.  

## One-to-one Relationship

In this example it is recreated the example explained earlier using the _writable views_ feature, where each delivery _order_ has only one _rider_ associated.
The goal of this writable view is to return the orders with the aggregated rider, providing a preview of the rider record content. Applications then can potentially call the riders collection endpoint with the specific `ObjectId` to query, modify or delete that record. 

Below are provided the collection and view definition:

```json title=collection
{
  "name": "orders-details",
  "endpointBasePath": "/orders-details-endpoint",
  "defaultState": "PUBLIC",
  "fields": [
    {
      "name": "updaterId",
      "type": "string",
      "description": "User id that has requested the last change successfully",
      "required": true
    },
    {
      "name": "updatedAt",
      "type": "Date",
      "description": "Date of the request that has performed the last change",
      "required": true
    },
    {
      "name": "creatorId",
      "type": "string",
      "description": "User id that has created this object",
      "required": true
    },
    {
      "name": "createdAt",
      "type": "Date",
      "description": "Date of the request that has performed the object creation",
      "required": true
    },
    {
      "name": "__STATE__",
      "type": "string",
      "description": "The state of the document",
      "required": true
    },
    {
      "name": "_id",
      "type": "ObjectId",
      "required": true
    },
    {
      "name": "date",
      "type": "Date",
      "required": false,
      "nullable": false
    },
    {
      "name": "totalAmount",
      "type": "number",
      "required": false,
      "nullable": false
    },
    {
      "name": "items",
      "type": "Array",
      "items": {
        "type": "string"
      },
      "description": "The item to deliver to the customer",
      "required": true,
      "nullable": false
    },
    {
      "name": "rider",
      "type": "RawObject",
      "schema": {
        "properties": {
          "value": {
            "type": "string",
            "__mia_configuration": {
              "type": "ObjectId"
            }
          },
          "label": {
            "type": "string"
          }
        }
      },
      "additionalProperties": false,
      "required": true,
      "nullable": false
    }
  ],
  "indexes": [
    {
      "name": "_id",
      "type": "normal",
      "unique": true,
      "fields": [
        {
          "name": "_id",
          "order": 1
        }
      ]
    }
  ]
}
```

```json title=View Definition
{
  "name": "orders-details",
  "source": "orders",        // source collection
  "type": "view",
  "enableLookup": true,      // enable the lookup feature
  "pipeline": [
    {
      "$lookup": {
        "from": "riders",    // lookup collection
        "localField": "riderId",
        "foreignField": "_id",
        "as": "rider",
        "pipeline": [
          {
            "$match": {
              "__STATE__": "PUBLIC"
            }
          },
          {
            "$project": {
              "_id": 0,      // to hide the _id field in the view
              "value": {
                "$toObjectId": "$_id"     // foreign key
              },
              "label": {
                "$toString": {
                  "$concat": ["$firstName", " ", "$lastName"]     // the aggregated value
                }
              }
            }
          }
        ]
      }
    },
    {
      "$unwind": {
        "path": "$rider",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$project": {
        "riderId": 0
      }
    }
  ]
}
```

Configuring the CRUD Service with the above collection and view definitions, and calling
the view `GET` endpoint:

```shell
curl -X 'GET' \
  'http://crud-service:3000/orders-details-endpoint/?_st=PUBLIC&_l=25' \
  -H 'accept: application/json'
```

would result in the following elements:

```json
[
  {
    "_id": "6554e9eedf0efad9177c8212",
    "date": "2023-11-17T14:17:08.770Z",
    "totalAmount": 12.5,
    "items": [
    ],
    "rider": {
      "value": "65576e773a7e5c988fee1084",
      "label": "Frodo Baggins"
    },
    "__STATE__": "PUBLIC"
  }
]
```

As it can be observed, the `riderId` has been replaced with an object representing the reference to the  record on the lookup collection. The application can now employ `PATCH` operations to change the reference on the underlying collection

As mentioned earlier, CRUD service also exposes a lookup route for the riders, `/orders-details-endpoint/lookup/rider`, so that it would be possible to know which riders can be associated to an order.

For example, calling the riders lookup endpoint over the _orders-details_ view:

```shell
curl -X 'GET' \
  'http://crud-service:3000/orders-details-endpoint/lookup/rider/?_st=PUBLIC&_l=25' \
  -H 'accept: application/json'
```

would yield the following response, that are all the available riders in the _riders_ collection:

```json
[
  {
    "value": "65576e773a7e5c988fee1084", // this is the rider in the previous result
    "label": "Frodo Baggins"
  },
  {
    "value": "64899570951afe064fd2d0d3",
    "label": "Samwise Gamgee"
  }
]
```

The data returned when accessing the `/orders-details-endpoint/lookup/rider` route will be a list of all riders present in the `riders` collection. The formatting of this data will adhere to the specific format specified in the lookup configuration.

To modify the lookup references of the underlying order record it is possible to call the `PATCH` endpoint in the following manner:

```shell
curl -X 'PATCH' \
  'http://crud-service:3000/orders-details-endpoint/?_st=PUBLIC' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "$set": {
    "rider": {
      "value": "64899570951afe064fd2d0d3"
    }
  }
}'
```

:::info
When a lookup field is an _array_ of references, the `$push`, `$addToSet` and `$pull` operators are also available in the `PATCH` update body.
:::

## One-to-many Relationship

This configuration example behaves similarly to the previous one, where a single rider is returned per order. In this case, however, it is allowed to have multiple riders associated to a single order (let's assume this is logical just within the scope of this example). To achieve this different behaviour it is sufficient to remove the `$unwind` operator from the view aggregation pipeline, so that multiple records would be returned.

Below are provided the collection and view definition:

```json title=collection
{
  "name": "orders-details",
  "endpointBasePath": "/orders-details-endpoint",
  "defaultState": "PUBLIC",
  "fields": [
    {
      "name": "updaterId",
      "type": "string",
      "description": "User id that has requested the last change successfully",
      "required": true
    },
    {
      "name": "updatedAt",
      "type": "Date",
      "description": "Date of the request that has performed the last change",
      "required": true
    },
    {
      "name": "creatorId",
      "type": "string",
      "description": "User id that has created this object",
      "required": true
    },
    {
      "name": "createdAt",
      "type": "Date",
      "description": "Date of the request that has performed the object creation",
      "required": true
    },
    {
      "name": "__STATE__",
      "type": "string",
      "description": "The state of the document",
      "required": true
    },
    {
      "name": "_id",
      "type": "ObjectId",
      "required": true
    },
    {
      "name": "date",
      "type": "Date",
      "required": false,
      "nullable": false
    },
    {
      "name": "totalAmount",
      "type": "number",
      "required": false,
      "nullable": false
    },
    {
      "name": "items",
      "type": "Array",
      "items": {
        "type": "string"
      },
      "description": "The item to deliver to the customer",
      "required": true,
      "nullable": false
    },
    {
      "name": "riders",
      "type": "Array",
      "items": {
        "type": "RawObject",
        "schema": {
          "properties": {
            "value": { "type": "string" },
            "label": { "type": "string" }
          }
        }
      },
      "additionalProperties": false,
      "required": true,
      "nullable": false
    }
  ],
  "indexes": [
    {
      "name": "_id",
      "type": "normal",
      "unique": true,
      "fields": [
        {
          "name": "_id",
          "order": 1
        }
      ]
    }
  ]
}
```

```json title=View Definition
{
  "name": "orders-details",
  "source": "orders",        // source collection
  "type": "view",
  "enableLookup": true,      // enable the lookup feature
  "pipeline": [
    {
      "$lookup": {
        "from": "riders",    // lookup collection
        "localField": "riderIds",
        "foreignField": "_id",
        "as": "riders",
        "pipeline": [
          {
            "$match": {
              "__STATE__": "PUBLIC"
            }
          },
          {
            "$project": {
              "_id": 0,      // to hide the _id field in the view
              "value": {
                "$toObjectId": "$_id"     // foreign key
              },
              "label": {
                "$toString": {
                  "$concat": ["$firstName", " ", "$lastName"]     // the aggregated value
                }
              }
            }
          }
        ]
      }
    },
    {
      "$project": {
        "riderIds": 0
      }
    }
  ]
}
```

Configuring the CRUD Service with the above collection and view definitions, and calling
the view `GET` endpoint:

```shell
curl -X 'GET' \
  'http://crud-service:3000/orders-details-endpoint/?_st=PUBLIC&_l=25' \
  -H 'accept: application/json'
```

would result in the following elements:

```json
[
  {
    "_id": "6554e9eedf0efad9177c8212",
    "date": "2023-11-17T14:17:08.770Z",
    "totalAmount": 12.5,
    "items": [
    ],
    "riders": [
      {
        "value": "65576e773a7e5c988fee1084",
        "label": "Frodo Baggins"
      }
    ],
    "__STATE__": "PUBLIC"
  }
]
```