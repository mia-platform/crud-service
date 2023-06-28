# Usage Best Practices

In this section, we will discuss how to read data from MongoDB collections using the **CRUD Service**. These collections have a dataset that can be modified through **UPDATE** or **DELETE** operations, either through APIs or, if related to Fast Data projections, through Kafka ingestion topics. As MongoDB is a NoSQL database, ensuring the ACID properties (Atomicity, Consistency, Isolation, and Durability) requires precautions both from an infrastructure and application perspective.

From this standpoint, the CRUD Service allows isolating operations at the collection level, as each collection corresponds to a set of APIs that can be used through the REST HTTP interface.

Additionally, it is necessary to consider the configuration of the underlying MongoDB cluster.

Cloud service providers offer solutions such as SaaS (e.g., MongoDB Atlas installation) or PaaS (e.g., MongoDB Enterprise) distributed on a cluster consisting of a replica set. A replica set is a group of nodes where data is stored consistently.

:::info
A replica set implements an acknowledgment mechanism to maintain data availability and consistency across its nodes. More information about a replica set can be found in the [MongoDB documentation](https://www.mongodb.com/docs/manual/core/replica-set-write-concern/).
:::

## Description

The operations performed by the CRUD Service are based on the official MongoDB connection driver.

Let's consider, for example, a `GET` method associated with a collection. Its invocation corresponds to a `find` operation in the driver, which [opens a cursor toward the replica set](https://www.mongodb.com/docs/manual/reference/glossary/#std-term-cursor). The result is an iterator of the data collected from the database, referred to as a `Result Set`.

Different read operations are enabled by the CRUD Service, to be used according to the needs of the application in which they are implemented. Specifically, we will focus on data retrieval procedures using **PAGINATION** (both unordered and ordered) and **STREAM**, enabled by the `GET /` and `GET /export` methods, respectively, exposed by each CRUD collection.

In particular, we want to evaluate the usage of these two procedures in terms of their resilience to UPDATE/DELETE operations, which could affect the ACID properties of a collection.

The analysis has produced the following results, which can be summarized in the following table.

|                           | **Pagination without sorting** | **Pagination with sorting on an indexed field** | **Pagination with sorting on an immutable field (example: unique indexed field)** | **Stream with export** |
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

- It may introduce performance overhead when retrieving large result sets, especially if sorting is complex.
- If the data changes during pagination, it may lead to missing or duplicate records on subsequent pages.

### Stream

#### Benefits

- It provides data streaming, allowing applications to consume data as it becomes available during query execution.
- It enables efficient processing and analysis of continuous data streams.
- It can be useful in scenarios where immediate data updates are critical, such as real-time analytics or monitoring.

#### Drawbacks

- It requires continuous processing and handling of data streams, which may increase resource utilization.
- Data ordering may not be guaranteed, depending on the stream source and processing pipeline.
- In the event of disruptions or failures in stream processing, data consistency can be compromised.

:::tip
It's important to choose the appropriate procedure based on the specific requirements and trade-offs of your application.
:::

## Scenarios

Let's consider the case of a single view called `my_single_view`, which corresponds to a MongoDB collection associated with the following JSON definition by the CRUD Service:

```json
{
    "id": "my_single_view",
    "description": "Collection of my_single_view",
    "name": "my_single_view",
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

A possible implementation to read data from the collection is to utilize client-side pagination by invoking the GET method with the query parameters `_sk` (skip) and `_l` (limit):
- the `_sk` parameter is used to specify the number of records to skip before starting to retrieve the result set. It allows you to navigate through different pages of data.
- the `_l` parameter represents the maximum number of records to retrieve in a single page. It determines the size of each page of data.

By adjusting the values of `_sk` and `_l`, you can control the pagination of data retrieval based on your specific requirements. For example, to retrieve the first page of data, you would set `_sk=0` and `_l` to the desired page size. For subsequent pages, you would increase the value of `_sk` by the page size to skip the already retrieved records.

:::info
If the `_sk` and `_l` parameters are not provided to the CRUD Service, the default behavior would be to apply a zero offset to the MongoDB cursor with a size equal to the value specified in the `CRUD_MAX_LIMIT` environment variable. The default value for `CRUD_MAX_LIMIT` is set to 200.
:::

Let's assume we have a collection consisting of 100 records, and we need to implement a pagination mechanism to retrieve 25 records at a time until all records are fetched.

This procedure translates into the following 4 HTTP requests to the GET /my_single_view/ endpoint:

- `GET /my_single_view/?_sk=0&_l=25`
- `GET /my_single_view/?_sk=25&_l=25`
- `GET /my_single_view/?_sk=50&_l=25`
- `GET /my_single_view/?_sk=75&_l=25`

Now, we want to filter the records based on the `updatedAt` field, which is updated by other services (such as the Single View Creator) to indicate the time when the record was last modified. 

Specifically, we want to try retrieving paginated records updated within the last 10 minutes.

In the following requests, the filter defined translates to the following MongoDB query contained in the `_q` query parameter:

```json
{"updatedAt":{"$gte":"your iso date"}}
```

The previously written procedure can be adapted as follows:

- `GET /my_single_view/?_sk=0&_l=25&_q=<mongodb query url-encoded>`
- `GET /my_single_view/?_sk=25&_l=25&_q=<mongodb query url-encoded>`
- `GET /my_single_view/?_sk=50&_l=25&_q=<mongodb query url-encoded>`
- `GET /my_single_view/?_sk=75&_l=25&_q=<mongodb query url-encoded>`


You would replace `your iso date` with the actual ISO-formatted date and time indicating the starting point for filtering the updatedAt field. This allows retrieving only the records that were updated after that specified date.

:::caution
Since the result could be smaller than the total size of the collection (i.e., 100 records), some of these requests may return an empty array, indicating that there are no more records to retrieve. This can lead to the pagination procedure ending earlier than expected.

When performing pagination with filtering, **it's essential to handle the scenario where a page request returns an empty result**. This indicates that all the records meeting the specified criteria have been retrieved, and there are no more pages to fetch.

To handle this situation, you can implement logic in your application that checks for an empty response and terminates the pagination process accordingly. For example, you could use a loop that continues making page requests until an empty response is received, indicating the end of the pagination.

Additionally, you may want to consider including some error handling mechanisms to handle potential issues during the pagination process, such as network errors or timeouts, to ensure the robustness and reliability of your pagination implementation.
:::

When performing a pagination request, if parallel **DELETE** or **UPDATE** operations occur, there is a risk of experiencing record loss or duplication.

Let's analyze the two possible operations that can be executed in parallel on the collection:

- **UPDATE**: During a pagination request, duplicates may be generated. If the record `{ "my_field": "1" }` is updated between the first and second requests, the record will be retrieved again during the subsequent requests.
In order to avoid duplicated records, you could sort the query result by an immutable field in the collection over time, such as a primary key (e.g., the `_id` field in MongoDB). In this case, by sorting based on the values of the `my_field` field, covered by the `my_field_index` index, you can prevent duplicates during the procedure. The updated pagination requests would be as follows:

  1. `GET /my_single_view/?_sk=0&_l=25&_s=my_field&_q=<mongodb query url-encoded>`
  2. `GET /my_single_view/?_sk=25&_l=25&_s=my_field&_q=<mongodb query url-encoded>`
  3. `GET /my_single_view/?_sk=50&_l=25&_s=my_field&_q=<mongodb query url-encoded>`
  4. `GET /my_single_view/?_sk=75&_l=25&_s=my_field&_q=<mongodb query url-encoded>`

:::note
Note that the sort query parameter `_s` has been added to the requests.
:::

- **DELETE**: In this case, record loss may occur between two different requests within the same pagination procedure. For example, if the record `{ "my_field": "1" }` is deleted during the time interval between the first and second request, the second request would return records starting from the 25th element of the collection, `{ "my_field": "26" }`, due to the `_sk=25` parameter. However, this record corresponds to the 26th element of the collection before the DELETE operation, and now `{ "my_field": "24" }` is the 24th record of the collection.

:::note
Even a sort mechanism would not prevent the occurrence of these events.
:::

### Conclusions

Implementing a pagination mechanism through the CRUD Service APIs is preferable when dealing with a static dataset with a low rate of update/delete operations.

When there is a **high number of update** operations, it is strongly recommended to apply to sort based on immutable fields, such as primary keys. These keys should be covered by MongoDB indexes to avoid excessive resource consumption by the Replica Set.

When there is a **high number of delete** operations, the possibility of record loss between requests is unavoidable. In this case, it is preferable to execute only one request within the procedure or use data streaming through the `GET /export` method.

### Use cases

The application of a pagination mechanism is recommended for scenarios that enhance the user experience of the end user, such as in the case of front-end applications that need to request and display a series of data in multiple sessions.

These data can be dynamic or static, but in the case of dynamic data, it is important to analyze the update rate of the relevant collection to ensure that the frequency of record updates is lower than the frequency at which the user performs operations on them (insertions/deletions/updates) in order to avoid inconsistent results.

## Read a collection with Streams

When the dataset of a collection has a high rate of **UPDATE/DELETE** operations compared to the rate of incoming HTTP requests, we suggest avoiding pagination mechanisms in favor of a data streaming approach.

The `GET /export` method exposed by each endpoint associated with a collection opens a data stream in `nd-json` format in the HTTP response. By using this method, the CRUD Service will open **only one cursor** to the MongoDB cluster, and the `ResultSet` will remain unaffected by concurrent **UPDATE/DELETE** operations.

:::info
[ndjson](http://ndjson.org/) is a format that ensures the streaming of data structures, where each record is processed individually and separated by a newline (`\n`) delimiter.

To properly read this format, it is necessary to specify the header `"Accept: application/x-ndjson" `within the HTTP request. This header informs the server that the client expects the response to be in `nd-json` format.
:::

In the given scenario, we can make a single HTTP request:

- `GET /my_single_view/export`

Alternatively, if we want to apply the previous filter on the updatedAt field, we can write:

- `GET /my_single_view/export?&_q=<mongodb query url-encoded>`

Now let's analyze the two possible operations that can be performed concurrently on the collection:

- **UPDATE**: If a record is updated during the cursor iteration, it will appear again in the result set. However, no records will be lost within the batches during the request.
- **DELETE**: If a record that has not been read by the batch is deleted during the cursor iteration, it will not be iterated in the result set. On the other hand, if the record has already been processed at the time of its deletion, it will not be removed from the result set that has already been returned by the cursor.

### Conclusions

The stream mechanism is useful for preserving the integrity of a record and obtaining a result set that is consistent with the current state of the database, as it is based on opening a single cursor.

:::caution
The HTTP response will be divided into chunks, meaning that the length of the response is not known in advance, and it will have a `Transfer-Encoding: chunked` header. HTTP client libraries typically provide an automatic mechanism to handle this type of response.
:::

### Use cases

The application of a stream mechanism is recommended in procedures where there is the need to retrieve data with an HTTP request that precisely replicates a single find operation of the MongoDB driver.

:::danger
Launching a stream query without any filters is equivalent to performing a collection scan, which is strongly discouraged, especially for collections with a large number of data.
:::
