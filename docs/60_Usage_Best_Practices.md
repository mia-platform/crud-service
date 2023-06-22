# Usage Best Practices

In this section, we will discuss how to read data from MongoDB collections using the **CRUD Service**. These collections have a dataset that can be modified through **UPDATE** or **DELETE** operations, either through APIs or, if related to Fast Data projections, through Kafka ingestion topics. As MongoDB is a NoSQL database, ensuring the ACID properties (Atomicity, Consistency, Isolation, and Durability) requires precautions both from an infrastructure and application perspective.

From this standpoint, the CRUD Service allows isolating operations at the collection level, as each collection corresponds to a set of APIs that can be used through the REST HTTP interface.

Additionally, it is necessary to consider the configuration of the underlying MongoDB cluster.

Cloud service providers offer solutions such as SaaS (e.g., MongoDB Atlas installation) or PaaS (e.g., MongoDB Enterprise) distributed on a cluster consisting of a replica set. A replica set is a group of nodes where data is stored consistently.

:::info
A replica set implements an acknowledgment mechanism to maintain data availability and consistency across its nodes. More information about a replica set can be found in the [MongoDB documentation](https://www.mongodb.com/docs/manual/core/replica-set-write-concern/).
:::

## Use cases

The operations performed by the CRUD Service are based on the official MongoDB connection driver.

Let's consider, for example, a `GET` method associated with a collection. Its invocation corresponds to a `find` operation in the driver, which [opens a cursor towards the replica set](https://www.mongodb.com/docs/manual/reference/glossary/#std-term-cursor). The result is an iterator of the data collected from the database, referred to as a `Result Set`.

Different read operations are enabled by the CRUD Service, to be used according to the needs of the application in which they are implemented. Specifically, we will focus on data retrieval procedures using **PAGINATION** (both unordered and ordered) and **STREAM**, enabled by the `GET /` and `GET /export` methods, respectively, exposed by each CRUD collection.

In particular, we want to evaluate the usage of these two procedures in terms of their resilience to UPDATE/DELETE operations, which could affect the ACID properties of a collection.

The analysis has produced the following results, which can be summarized in the following table.

|                           | **Pagination without sorting** | **Pagination with sorting on a indexed field** | **Pagination with sorting on a immutable field (example: unique indexed field)** | **Stream with export** |
|---------------------------|--------------------------------|------------------------------------------------|----------------------------------------------------------------------------------|------------------------|
| PREVENTS DATA DUPLICATION |             &Cross;            |                     &Cross;                    |                                      &check;                                     |         &check;        |
| PREVENTS DATA LOSS        |             &Cross;            |                     &Cross;                    |                                      &Cross;                                     |         &check;        |

Now let's examine in detail the benefits and drawbacks of the different procedures listed.

### Pagination - unordered:

#### Benefits

- It allows retrieving data in smaller chunks, which can be useful for displaying data in a paginated manner.
- It provides control over the number of records fetched per page, optimizing resource utilization.
- It can handle large result sets efficiently by retrieving only a subset of data at a time.

#### Drawbacks

- The order of records may not be guaranteed unless additional sorting criteria are applied.
- If the data is frequently updated or deleted, the pagination result may become inconsistent.

### Pagination - ordered:

#### Benefits

- It retrieves data in a specific order, providing consistency in the result set.
- It is useful when maintaining a consistent view of data is crucial, such as in chronological or alphabetical sorting.

#### Drawbacks

- IT may introduce performance overhead when retrieving large result sets, especially if sorting is complex.
- If the data changes during pagination, it may lead to missing or duplicate records in subsequent pages.

### Stream

#### Benefits

- It provides real-time data streaming, allowing applications to consume data as it becomes available.
- It enables efficient processing and analysis of continuous data streams.
- It can be useful in scenarios where immediate data updates are critical, such as real-time analytics or monitoring.

#### Drawbacks

- It requires continuous processing and handling of data streams, which may increase resource utilization.
- Data ordering may not be guaranteed, depending on the stream source and processing pipeline.
- In the event of disruptions or failures in the stream processing, data consistency can be compromised.

:::tip
It's important to choose the appropriate procedure based on the specific requirements and trade-offs of your application.
:::

## Scenarios

Let's consider the case of a single view called `my_single_view`, which corresponds to a MongoDB collection associated with the following JSON definition by the CRUD Service:

```json
{
    "fields": [
        {
            "name": "_id",
            "description": "_id",
            "type": "ObjectId",
            "required": true,
            "nullable": false
        },
        {
            "name": "creatorId",
            "description": "creatorId",
            "type": "string",
            "required": true,
            "nullable": false
        },
        {
            "name": "createdAt",
            "description": "createdAt",
            "type": "Date",
            "required": true,
            "nullable": false
        },
        {
            "name": "updaterId",
            "description": "updaterId",
            "type": "string",
            "required": true,
            "nullable": false
        },
        {
            "name": "updatedAt",
            "description": "updatedAt",
            "type": "Date",
            "required": true,
            "nullable": false
        },
        {
            "name": "__STATE__",
            "description": "__STATE__",
            "type": "string",
            "required": true,
            "nullable": false
        },
        {
            "name": "my_field",
            "type": "string",
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
        },
        {
            "name": "createdAt",
            "type": "normal",
            "unique": false,
            "fields": [
                {
                    "name": "createdAt",
                    "order": -1
                }
            ]
        },
        {
            "name": "my_field_index",
            "type": "normal",
            "unique": true,
            "fields": [
                {
                    "name": "my_field",
                    "order": 1
                }
            ]
        }
    ]
}
```

In addition to the fields required by the CRUD Service (such as `__STATE__`, `updatedAt`, etc.), there is a mandatory string field called `my_field`, which is associated with a unique index named `my_field_index`.

This indicates that the `my_field` field must be present in each document within the `my_single_view` collection, and it must have a unique value across all documents in the collection. The unique index ensures the uniqueness constraint on the `my_field` field, preventing duplicate values from being inserted into the collection.

## Pagination