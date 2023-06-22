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

A possible implementation to read data from the collection is to utilize client-side pagination by invoking the GET method with the query parameters `_sk` (skip) and `_l` (limit):

The `_sk` parameter is used to specify the number of records to skip before starting to retrieve the result set. It allows you to navigate through different pages of data;

The `_l` parameter represents the maximum number of records to retrieve in a single page. It determines the size of each page of data.

By adjusting the values of `_sk` and `_l`, you can control the pagination of data retrieval based on your specific requirements. For example, to retrieve the first page of data, you would set `_sk=0` and `_l` to the desired page size. For subsequent pages, you would increase the value of `_sk` by the page size to skip the already retrieved records.

:::info
If the `_sk` and `_l` parameters are not provided to the CRUD Service, the default behavior would be to apply a zero offset to the MongoDB cursor with a size equal to the value specified in the `CRUD_MAX_LIMIT` environment variable. The default value for `CRUD_MAX_LIMIT` is set to 200.
:::

Let's assume we have a collection consisting of 100 records, and we need to implement a pagination mechanism to retrieve 25 records at a time until all records are fetched.

This procedure translates into the following 4 HTTP requests to the GET /my_single_view/ endpoint:

- GET /my_single_view/?_sk=0&_l=25
- GET /my_single_view/?_sk=25&_l=25
- GET /my_single_view/?_sk=50&_l=25
- GET /my_single_view/?_sk=75&_l=25

Now, we want to filter the records based on the `updatedAt` field, which is updated by other services (such as the Single View Creator) to indicate the time when the record was last modified. 

Specifically, we want to try retrieving paginated records updated within the last 10 minutes.

The previously written procedure can be adapted as follows:

- GET /my_single_view/?_sk=0&_l=25&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22%22%7D%7D
- GET /my_single_view/?_sk=25&_l=25&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D
- GET /my_single_view/?_sk=50&_l=25&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D
- GET /my_single_view/?_sk=75&_l=25&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D

In the above requests, the filter defined translates to the following MongoDB query contained in the `_q` query parameter:

```json
{"updatedAt":{"$gte":"your iso date"}}
```

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

  1. GET /my_single_view/?_sk=0&_l=25&_s=my_field&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22%22%7D%7D
  2. GET /my_single_view/?_sk=25&_l=25&_s=my_field&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D
  3. GET /my_single_view/?_sk=50&_l=25&_s=my_field&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D
  4. GET /my_single_view/?_sk=75&_l=25&_s=my_field&_q=%7B%22updatedAt%22:%7B%22$gte%22:%22your%20iso%20date%22%7D%7D

:::note
Note that the sort query parameter `_s` has been added to the requests.
:::

- **DELETE**: In this case, record loss may occur between two different requests within the same pagination procedure. For example, if the record `{ "my_field": "1" }` is deleted during the time interval between the first and second request, the second request would return records starting from the 25th element of the collection, `{ "my_field": "26" }`, due to the `_sk=25` parameter. However, this record corresponds to the 26th element of the collection before the DELETE operation, and now `{ "my_field": "24" }` is the 24th record of the collection.

:::note
Even a sort mechanism would not prevent the occurrence of these events.
:::

