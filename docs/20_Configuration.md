# CRUD Service Configuration

This service can be added to your project by visiting Mia-Platform [Marketplace](../../marketplace/overview_marketplace.md) and creating a new microservice from the **CRUD Service** plugin.

## Configure a CRUD Service to use MongoDB CRUD section

In order to start using the MongoDB CRUD section, all you have to do is adding it from the Marketplace: all the ConfigMaps and environment variables it needs will be precompiled with no need to change them.

:::info
The CRUD Service supports custom CA certs. If you want to learn more about these certificates and how to configure them in your CRUD Service, visit [this page](../../development_suite/api-console/api-design/services#provide-a-ca-certificate-to-a-custom-service).
:::

### ConfigMap

The CRUD Service default ConfigMap is mounted in `/home/node/app/collections`. You can freely choose its name during the service creation.

Furthermore, the ConfigMap is not editable, as it is fundamental for the MongoDB CRUD section to work. It is not possible to add files, edit the mountPath, or delete it.

However, you will find a link that will redirect you to **MongoDB CRUD** dedicated section where you can continue to configure your project [CRUDs](../../development_suite/api-console/api-design/crud_advanced.md). By doing so, you will automatically define the collections that will be handled by the service, which means that there is no need to add any configuration files.

## Environment variables

Below you can find all the environment variables that you can edit.

| Variable                        | Type    | Required | Default value                             | Description                                                                                                                                                                                                                               |
|---------------------------------|---------|----------|-------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| MONGODB_URL                     | String  | Required | -                                         | The MongoDB connection string. It **must** contain the database name on which the collections will be managed.                                                                                                                            |
| COLLECTION_DEFINITION_FOLDER    | String  | Required | `/home/node/app/collections`              | The path to the folder where all collections are defined.                                                                                                                                                                                 |
| VIEWS_DEFINITION_FOLDER         | String  | Required | `/home/node/app/collections`              | The path to the folder where all views are defined.                                                                                                                                                                                       |
| USER_ID_HEADER_KEY              | String  | Required | -                                         | Header key used to know which user makes the request. User id is useful to add `creatorId` and `updaterId` field in collection document.                                                                                                  |
| CRUD_MAX_LIMIT                  | Integer | Optional | 200                                       | Configures the maximum limit of objects returned by a MongoDB query.                                                                                                                                                                      |
| CRUD_LIMIT_CONSTRAINT_ENABLED   | Boolean | Optional | `true`                                    | Enables the query limit constraint feature. If set to `false`, the `CRUD_MAX_LIMIT` environment variable won't be used.                                                                                                                   |
| TRUSTED_PROXIES                 | String  | Optional | `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16` | Contains the trusted proxies values.                                                                                                                                                                                                      |
| HTTP_PORT                       | String  | Optional | -                                         | The port exposed by the service.                                                                                                                                                                                                          |
| LOG_LEVEL                       | String  | Optional | `info`                                    | Level of the log. It can be one of the following: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.                                                                                                                                     |
| EXPOSE_METRICS                  | Boolean | Optional | `true`                                   | Specifies if Prometheus metrics should be exposed or not.                                                                                                                                                                                 |
| ALLOW_DISK_USE_IN_QUERIES       | Boolean | Optional | -                                         | Sets the `allowDiskUse` option in the MongoDB queries. It is useful when working with MongoDB Views requiring heavy aggregations (added in v6.0.2, works with MongoDB >= 4.4).                                                            |
| ENABLE_TRACING                  | Boolean | Optional | `false`                                   | Specifies if OpenTelemetry tracing should be enabled. It is possible to find more documentation [here](https://docs.mia-platform.eu/docs/runtime_suite_libraries/lc39/main-entrypoint#opentelemetry-tracing-experimental)                 |
| ENABLE_STRICT_OUTPUT_VALIDATION | Boolean | Optional | `false`                                   | Specifies whether service responses should be strict compliant with the schema (when enabled the service would fail to return values in case underlying collection contains documents not compliant with the schema)                      |
| MAX_MULTIPART_FILE_BYTES        | Number  | Optional | 100                                       | Sets the max size (Mb) that is possible to process in multipart requests                                                                                                                                                                  |
| MONGODB_MAX_IDLE_TIME_MS        | Number  | Optional | 0                                         | Controls the MongoDB `maxIdleTimeMs` connection option (default set to 0 for backward compatibility, meaning the opened connection remain opened indefinitely)                                                                            |
| HELPERS_PREFIX                  | String  | Optional | `/-/`                                     | prefix string to assign to the helpers plugin, which exposes additional routes, such as `/schemas`                                                                                                                                        |
| OPEN_API_SPECIFICATION          | String  | Optional | `swagger`                                 | Specification used to expose Swagger. Allowed values are: `swagger` (for Swagger 2.0) and `openapi` (for OpenAPI 3.0)                                                                                                                     |
| CRYPT_SHARED_LIB_PATH           | String  | Optional |                                           | Defines the absolute path where the MongoDB dynamic library `crypt_shared` can be found. This environment variable is already set within the plugin, which already contains the shared library to support MongoDB auto-encryption feature |

:::warning
Using `ALLOW_DISK_USE_IN_QUERIES` (either with `true` or `false` values) with a MongoDB version lower than 4.4 will make all the GET calls unusable since the MongoDB cluster will raise an error for the unrecognized option `allowDiskUse`.

It is also important to notice that starting from MongoDB v6.0 new server property [`allowDiskUseByDefault`](https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.allowDiskUseByDefault)
is introduced with its value set to `true` by default. Consequently, the default behavior for that MongoDB version
is that for queries with pipeline stages using more than 100 MB of memory to execute, the database automatically
write temporary files on disk to support those queries.  
This default behavior can be disabled for _all_ queries by setting `ALLOW_DISK_USE_IN_QUERIES` to `false`.  
:::

In case you want to use [Client Side Field Level Encryption](https://docs.mongodb.com/manual/core/security-client-side-encryption/),
you should also include several specific Environment Variables, either you are using the [encryption with Google Platform Cloud](./30_Encryption_configuration.md#configure-csfle-with-the-google-cloud-platform-gcp)
or a [local key](./30_Encryption_configuration.md#configure-csfle-with-local-key).
