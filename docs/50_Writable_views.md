# Writable Views

:::danger
This feature reqiures at least MongoDB with version higher than 4.4
:::

Writable views provide the capability to modify Mongo Views by exposing POST, PATCH, and DELETE routes for these objects. The CRUD service ensures the creation of a consistent interface that allows querying and modifying the underlying collection of the view. This abstraction of complexity simplifies the process of client interaction with views.

In addition, the CRUD service will expose additional routes corresponding to each lookup field present in the view. These routes are created for each first-level $lookup step in the pipeline. Accessing these routes, denoted as `/lookup/<name of the view field>`, will provide the data from the lookup collection in the same format as specified in the view pipeline. This enables obtaining all the possible values that can be inserted into the view field.

:::warning
This feature is specifically designed for collections with many-to-one or one-to-one relationships that have a single level of depth. It is not intended for collections with multiple levels of depth in their relationships.
:::

# How to configure it

To enable this feature, it is necessary to set the `enableLookup` flag to `true` within the view definition. By default, this flag is set to false. Additionally, to have full support for lookup collections, further steps described in the next paragraph need to be followed in the view pipeline.

# View pipeline lookup requirements

In order to configure the view pipeline to support this lookup feature, it is necessary:

1. Have at least one `$lookup` step in the view pipeline followed by `$unwind` to make sure only one object it is returned;
2. The `$lookup` step must contain a field called `value`, this will be the one that will contain the external collection identifier (basically the foreign key);
3. To maintain typing with the schema, you will need to specify the type of the value you are creating, this using the casting operators made available by MongoDB. Available operators are:
    - `$toBool`
    - `$toDate`
    - `$toDecimal`
    - `$toDouble`
    - `$toInt`
    - `$toLong`
    - `$toObjectId`
    - `$toString`
  
# Example

In this example we will create a view on top of `orders` collection, that it is a collection containing a `id_rider`, who will deliver the order, and a `items` array, list of items to deliver. This view will return a rider object with the name and surname as label, instad of the plain `id_rider`.  

Here the view definition:


In this example, we will create a view based on the `orders` collection. The orders collection contains an `id_rider` field representing the rider id assigned to deliver the order, as well as an items array listing the items to be delivered. The purpose of this view is to transform the `id_rider` into a more meaningful representation by returning a `rider` object with the `name` and `surname` as label.

Here is the view definition:


```js title=view
// View
module.exports = {
  name: 'orders-details',
  source: 'orders',
  type: 'view',
  enableLookup: true, // Enable the lookup feature
  pipeline: [
    {
      $lookup: {
        from: 'riders',
        localField: 'id_rider',
        foreignField: '_id',
        as: 'rider',
        pipeline: [
          {
            $project: {
              _id: 0, // To hide the _id field in the view
              value: {
                $toObjectId: '$_id', // Foreign key
              },
              label: {
                $toString: {
                  $concat: ['$name', ' ', '$surname'], // the aggregated value
                },
              },
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$rider',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        rider: 1,
        items: 1,
        __STATE__: 1,
      },
    },
  ],
}
```

And here the colleciton definition:

```js title=collection
// Collection
module.exports = {
  name: 'orders-details',
  endpointBasePath: '/orders-details-endpoint',
  defaultState: 'PUBLIC',
  fields: [
    {
      name: '_id',
      type: 'ObjectId',
      required: true,
    },
    {
      name: '__STATE__',
      type: 'string',
      description: 'The state of the document',
      required: true,
    },
    {
      name: 'rider',
      type: 'RawObject',
      schema: {
        properties: {
          value: {
            type: 'string',
            __mia_configuration: {
              type: 'ObjectId',
            },
          },
          label: { type: 'string' },
        },
      },
      additionalProperties: false,
      required: true,
      nullable: false,
    },
    {
      name: 'items',
      type: 'Array',
      items: {
        type: 'string',
      },
      description: 'The item to deliver to the customer',
      required: true,
      nullable: false,
    },
  ],
  indexes: [
    {
      name: '_id',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: '_id',
          order: 1,
        },
      ],
    },
  ],
}
```

This will lead to a this results:

```json
[
  {
    "_id": "6489961b951afe064fd2d0d4",
    "__STATE__": "PUBLIC",
    "items": [
      "Pizza"
    ],
    "rider": {
      "value": "64899515951afe064fd2d0d1",
      "label": "Foo Bar"
    }
  }
]
```

As mentioned earlier, the CRUD service will also expose lookup routes. In this case, the lookup field in the view is rider, so the corresponding route will be `/lookup/rider`. Accessing this route will return the following information:

```json
[
  {
     "value": "64899515951afe064fd2d0d1", // this is the rider in the previous result
     "label": "Foo Bar",
  },
  {
     "value": "64899570951afe064fd2d0d3",
     "label": "Baz qux",
  }
]
```

The data returned when accessing the `/lookup/rider` route will be a list of all riders present in the `riders` collection. The formatting of this data will adhere to the specific format specified in the lookup configuration.