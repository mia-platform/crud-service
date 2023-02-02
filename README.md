<div align="center">
<h1>CRUD Service</h1>
[![pipeline status][pipeline]][git-link]
[![javascript style guide][standard-mia-svg]][standard-mia]  
[![coverage report][coverage]][git-link]
</div>

## Introduction

The **CRUD Service** is a lightweight application that exposes an HTTP Interface to perform CRUD operations on MongoDB collections defined via JSON Schema, to make sure to have consistent data in every operation. Moreover, your documents will includes some metadata regarding the creation and the latest update of the document, and a state that will come in handy to better manage draft documents and virtual delete.

The **CRUD Service** can be launched with [lc39](https://github.com/mia-platform/lc39), that will start a [Fastify](https://fastify.io) instance that will include the functionalities. It also includes a Swagger User Interface to be used to perform any operation for each of the collections defined.

## How to run it

### Local deployment

To deploy the service in your local environment, you must have:
- Node at version 14 or superior,
- MongoDB instance at version 4.0 or superior

To setup Node, we suggest you to install [nvm][nvm] to have multiple node versions in your computer, and use the version suggested in the `.nvmrc` file.
```sh
nvm install # <-- to be done only the first time
nvm use
```

About mongo, we suggest you to have it in a separate Docker container. You can follow this small guide or use the configuration you prefer:
```shell
docker pull mongo:6.0
docker volume create mongo
docker run --detach --name mongo -p 27017:27017 --mount source=mongo,target=/data/db mongo:6.0
```

In case you want to use the MongoDB Encryption functionality, you must install in your machine the [MongoDB Enterprise Server](https://www.mongodb.com/try/download/enterprise?tck=docs_server) and run the `mongocryptd` file (its location may change based on the version you downloaded).

To run the **CRUD Service**, a `.env` file including the needed configuration is required. An example of this file is the [default.env](default.env) file. You want to copy the file in a different path to avoid to have your configuration ignored by Git:
```shell
cp ./default.env ./.env
```

The `default.env` only list the necessary environment variables to be added to successfully run the CRUD Service in your local machine. A complete list of the environment variables can be found [in the related page](envSchema.js#L25). Once you have your environment variables file, feel free to update it the way you want.

Then you can run the service:
```shell
nvm use # <-- only if you use nvm
npm i
npm run start:local
```

### Use the Docker Image

A Docker image for every version of the **CRUD Service** is deployed in the [Mia-Platform Nexus Repository](https://nexus.mia-platform.eu/).
If you are interested in it, you can get one and run it locally with this commands:
```shell
docker pull nexus.mia-platform.eu/core/crud-service:latest
export LOCALHOST=192.168.x.x
docker run --name crud-service \
           --detach \
           --env LOG_LEVEL=info \
           --env MONGODB_URL=mongodb://${LOCALHOST}/crud \
           --env COLLECTION_DEFINITION_FOLDER=/home/node/app/collections \
           --env USER_ID_HEADER_KEY=userid \
           --env CRUD_LIMIT_CONSTRAINT_ENABLED=true \
           --env CRUD_MAX_LIMIT=200 \
           --mount type=bind,source=$(pwd)/tests/collectionDefinitions,target=/home/node/app/collections \
           --publish 3000:3000 \
           nexus.mia-platform.eu/core/crud-service:latest
```

Please note that, in this case, the list of environment variables must be included when running the service.

### How to use it

You can access the **Swagger User Interface**, generally available at http://localhost:3000/documentation (it depends on which port you deployed the service). From there you can verify the list of Collections and Views defined and execute HTTP requests to effectively use the service.

## Local development
### Run tests

We use [tap](https://github.com/tapjs/node-tap) to test the **CRUD Service**. Once you have all the dependency in place, you can simply launch it with:
```shell
npm run coverage
```

It will run the tests with the coverage report that you can view as an HTML page in `coverage/lcov-report/index.html`. 

To run only one test:

```shell
env MONGO_HOST=127.0.0.1 TAP_BAIL=1 node tests/createIndexes.test.js
```

## Architecture

```
+----------------------+  +----------------------+  +----------------------+  +----------------------+
|                      |  |                      |  |                      |  |                      |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |                      |
|   |             |    |  |   |             |    |  |   |             |    |  |    +-------------+   |
|   | CrudService |    |  |   | CrudService |    |  |   | CrudService |    |  |    |             |   |
|   |             |    |  |   |             |    |  |   |             |    |  |    | JoinService |   |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |    |             |   |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |    +-------------+   |
|   |             |    |  |   |             |    |  |   |             |    |  |                      |
|   | QueryParser |    |  |   | QueryParser |    |  |   | QueryParser |    |  |                      |
|   |             |    |  |   |             |    |  |   |             |    |  |                      |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |                      |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |                      |
|   |             |    |  |   |             |    |  |   |             |    |  |                      |
|   |HTTPInterface|    |  |   |HTTPInterface|    |  |   |HTTPInterface|    |  |                      |
|   |             |    |  |   |             |    |  |   |             |    |  |                      |
|   +-------------+    |  |   +-------------+    |  |   +-------------+    |  |                      |
|                      |  |                      |  |                      |  |                      |
| Crud on a collection |  | Crud on a collection |  | Crud on a collection |  |      JoinPlugin      |
|                      |  |                      |  |                      |  |                      |
+-----------^----------+  +-----------^----------+  +-----------^----------+  +-----------^----------+
            |                         |                         |                         |
+-----------+-------------------------+-------------------------+-------------------------+----------+
|                                                                                                    |
|             +--------------------+                               +--------------------+            |
|             |                    |                               |                    |            |
|             | Model definitions  |           FASTIFY             | Mongodb connection |            |
|             |                    |                               |                    |            |
|             +--------------------+                               +--------------------+            |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

The CRUD Service application uses Fastify to connect to a MongoDB instance (thanks to the @fastify/mongodb plugin) and execute CRUD operations. At startup, it requires several informations, such as the mongoDB URL to communicate with, but also the folders where there are included the definitions of the collections and the views. A complete and comprehensive list of the environment variables needed can be found in the [Configuration page](./docs/20_Configuration.md).

The collections and the views available in the service are the ones with Model definitions stored in the folders defined in, respectively, `COLLECTION_DEFINITION_FOLDER` and `VIEWS_DEFINITION_FOLDER`. In each folder, there will be one file per collection/view. Each file should be a JSON or a javascript file.

These models will be analyzed by the [JSONSchemaGenerator](./lib/JSONSchemaGenerator.js) class to be transformed to a JSON Schema that will be used to validate HTTP requests, to serialize the output and to return these information to the user as a documentation. 

The service exposes several APIs to communicate with the collections. You can send requests as you prefer: you can use curl, use an application such as PostMan, or use the integrated Swagger API Interface accessible to `http://{{url}}/documentation`.

When the Service is live, every HTTP request executed will be caught by the HTTP Interface that works as a communication channel with the CRUD Service. The data included with the request (query parameters, body, commands) is evaluated by the [`QueryParser`](./lib/QueryParser.js) class to verify the query to make sure that every value associated to a specific field is in the correct type. Then it's forwarded to the [`CrudService`](./lib/CrudService.js) class to execute the query. Result of `GET` requests are passed to the [`ResultCaster`](./lib/ResultCaster.js) class to casts properties in the data with the types defined in the models.

### Define your collections

The collections should be included in separate JSON or JavaScript files in the folder defined with the environment variable `COLLECTION_DEFINITION_FOLDER`. Each collection object requires the following fields:

| Name             | Type             | Required | Default value | Description                                                                                                                                                                                                                                  |
|------------------|------------------|----------|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name             | String           | Required | -             | The name of the collection, used as identifier                                                                                                                                                                                               |
| endpointBasePath | String           | Required | -             | The endpoint path, used as entry point to CRUD operations                                                                                                                                                                                    |
| defaultState     | String           | Required | -             | The MongoDB connection string.                                                                                                                                                                                                               |
| name             | String           | Required | 'DRAFT'       | The default state assigned to a document when inserted. Can be one of the [\_\_STATE__ available values](#metadata-fields)                                                                                                                   |
| fields           | Array of objects | Required | -             | The list of fields to be included in the collection object. A complete description of its fields can be found [in the _fields_ section of the collection JSON Schema](./lib/model.jsonschema.js#L42).                                        |
| indexes          | Array of objects | Required | -             | The list of indexes to be created when starting the service and initializing all the collections. A complete description of its fields can be found [in the _indexes_ section of the collection JSON Schema](./lib/model.jsonschema.js#L204) |

**WARNING:** The definition of _unique_ indexes makes the CRUD Service fail at startup if the database contains inconsistent documents (e.g. documents that have the same value for that key). Also documents without that key are all considered to have the same value (_null_), thus [violating the uniqueness](https://docs.mongodb.com/manual/core/index-unique/#unique-index-and-missing-field), and causing the index generation (and the CRUD Service) to fail at startup.

**WARNING:** every index that is not specified in the collection definition wil be **dropped** at startup of the application, unless its _name_ starts with the `preserve_` prefix.

Several examples of collections can be found in the [CollectionDefinitions folder](./tests/collectionDefinitions/).

### Define your views

The MongoDB Views should be included in separate JSON or JavaScript files in the folder defined with the environment variable `VIEWS_DEFINITION_FOLDER`. Each collection object requires the following fields:

| Name     | Type   | Required | Default value | Description                                                                                                                                                       |
|----------|--------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name     | String | Required | -             | The name of the view, used as identifier                                                                                                                          |
| source   | String | Required | -             | The name of the collection to be used as source to generate the view                                                                                              |
| type     | `view` | Required | -             | The type of MongoDB element, which is required by CRUD Service to understand which operations might be performed. It should be the value `view`.                  |
| pipeline | Object | Required | -             | The pipeline to aggregate the MongoDB View. It uses the same syntax of the [Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/) |

Several examples of collections can be found in the [CollectionDefinitions folder](./tests/viewsDefinitions/).

### Headers

Every HTTP request trusts in some headers:

* **acl_rows** allows us to limit the rows that the requester can see. The query to limit the rows is passed a stringified json.
* **acl_read_columns** allows us to limit the properties to be returned to the requester. The list of properties is passed as a stringified json.
* **json-query-params-encoding** allows us to use a different encoder for the data passed as query parameters (only supported value: _base64_)
* **user_id** includes the identifier of the user executing the request

### Metadata fields

When working with collections via CRUD Service, some fields will be automatically generated and updated. Those fields are the following:

* **updaterId** is the user id (string) that requests the last change successfully
* **updatedAt** is the date (date) of the request that has performed the last change
* **creatorId** is the user id (string) that creates this object
* **createdAt** is the date (date) of the request that has performed the object creation
* **\_\_STATE__** is the current state of the document, can be one of the following four:
  * `PUBLIC` (by default, only data in `public` will be shown via `GET` requests)
  * `DRAFT`
  * `TRASH` (a "soft delete" state, ideally to be visible in the Trash Bin of a backoffice application)
  * `DELETED` (marked as delete, it shouldn't be shown in GET requests and it shouldn't be modified with PUT operations)

#### Document State management

We've just explained the difference between the four possible states of a document. This property can be set directly during an _insert_, and can be changed via REST API calls only in case of the following transformations:
- a document in `PUBLIC` can be moved to `DRAFT` or `TRASH`; 
- a document in `DRAFT` can be moved to `PUBLIC` or `TRASH`; 
- a document in `TRASH` can be moved to `DRAFT` or `DELETED`; 
- a document in `DELETED` can be moved to only to `TRASH`; 

Operations of hard delete are supported, although the permissions over this type of operations is defined via ACL.
  
### Crud service

This class makes the query to the mongodb collection, manages `updaterId`, `updatedAt`,
`creatorId`, `createdAt`, `__STATE__` and checks whether operations are allowed.

### QueryParser

This class casts the value from the query, the body and the commands in order to insert `Date` and `ObjectId`
and perform other conversions such as `GeoPoint` where needed

### ResultCaster

This class casts the value of the result from a query executed in order to have consistent data with the definition of the collection. It operates only on two types of properties: MongoDB's `GeoPoint` and `number`.

### HTTPInterface

This piece of code is a communication channel between HTTP and the CrudService.
It uses the `QueryParser` to cast the value before forwarding the request to the `crudService`, and the `ResultCaster` to cast the value to be returned.

The HTTPInterface includes by default different API methods for every kind of operation. The following are available for both Collections and Views:

| Verb | API Method                   | Description                                    | 
|------|------------------------------|------------------------------------------------|
| GET  | {base URL}/{endpoint}/       | Returns a list of documents.                   |
| GET  | {base URL}/{endpoint}/export | Export the collection.                         |
| GET  | {base URL}/{endpoint}/{id}   | Returns the item with specific _ID_.           |
| GET  | {base URL}/{endpoint}/count  | Returns the number of items in the collection. |

For collections, also the following methods are available:

| Verb   | Method                           | Description                                                                                  | 
|--------|----------------------------------|----------------------------------------------------------------------------------------------|
| POST   | {base URL}/{endpoint}/           | Add a new item to the collection.                                                            |
| POST   | {base URL}/{endpoint}/upsert-one | Update an item in the collection. If the item is not in the collection, it will be inserted. |
| POST   | {base URL}/{endpoint}/bulk       | Insert new items in the collection.                                                          |
| POST   | {base URL}/{endpoint}/state      | Change state of multiple items of the collection.                                            |
| POST   | {base URL}/{endpoint}/{id}/state | Change state of the item with specific _ID_.                                                 |
| POST   | {base URL}/{endpoint}/validate   | Verify if the body of the request is valid for an insertion in the collection.               |
| PATCH  | {base URL}/{endpoint}/           | Update the items of the collection that match the query.                                     |
| PATCH  | {base URL}/{endpoint}/{id}       | Update the item with specific _ID_ in the collection.                                        |
| PATCH  | {base URL}/{endpoint}/bulk       | Update multiple items of the collection, each one with its own modifications                 |
| DELETE | {base URL}/{endpoint}/           | Delete multiple items from the collection.                                                   |
| DELETE | {base URL}/{endpoint}/{id}       | Delete an item with specific _ID_ from the collection.                                       |

All these methods might include additional query parameters to refine the search. To have more detail, you can check the [live documentation](http://localhost:3000/documentation).


### JoinService

The CRUD Service includes also the `join` feature, to join two different models. That feature is served on `/join/<type>/:from/:to/export`, where:
- type: `one-to-one` or `one-to-many` or `many-to-many`
- from: the collection endpoint from which the join starts
- to: the collection endpoint which the join ends to
This API responses always in `application/application/x-ndjson`

See the documentation to see which parameters are available.

## FAQ

### How do I change the Mongocryptd version on Debian

To change the cryptd version, you can download the binary file from the [MongoDB Repositories](cryptd), then navigate to the following subpath: `{version_wanted}/main/binary_amd64/mongodb-enterprise-cryptd_{version_wanted}_amd64.deb`.

For example, for version 5.0.14, the final url of the `.deb` will be: https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/5.0/main/binary-amd64/mongodb-enterprise-cryptd_5.0.14_amd64.deb

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for further details about the process for submitting pull requests.

[pipeline]: /crud-service/badges/master/pipeline.svg
[coverage]: /crud-service/badges/master/coverage.svg
[git-link]: /crud-service/commits/master

[standard-mia-svg]: https://img.shields.io/badge/code_style-standard--mia-orange.svg
[standard-mia]: https://github.com/mia-platform/eslint-config-mia

[nvm]: https://github.com/creationix/nvm
[merge-request]: /crud-service/merge_requests
[cryptd]: https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/
