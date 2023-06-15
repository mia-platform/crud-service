# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 6.6.1 - 2023-06-15

### Fixed

- #88 dot (`.`) notation with operator `$set` is now correctly supported
- #89 operators `$addToSet` and `$pull` are now supported on properties added via `additionalProperties` JSON schema definition
- collection definition validation is now carried out only once per collection

### Changed

- update minor and patch dependencies

## 6.6.0 - 2023-06-09

### Added

- add option to enable tracing

### Changed

- upgrade lc39 to v7, which upgrade fastify to v4
- updated documentation regarding service configuration to clarify the database name in the connection string
- call to configure MongoDB are now concurrent
- JSON Schema Generator refactoring to reduce duplicated operations

### Fixed

- updated broken links in documentation
- wrong swagger configuration

## 6.5.2 - 2023-05-08

### Changed

- `__mia_configuration` property in a collection `schema` now accepts additional properties
- improved validation message for "body must NOT have additional properties" Ajv error, now it also says the unwanted property
- optimization of the __STATE__ query sent to MongoDB: $in operator has been removed when not necessary

## 6.5.1 - 2023-04-20

### Fixed

- encryption not working with JSON Schema collection definition

## 6.5.0 - 2023-04-20

### Added

- Collections configuration files can now accept a new field `schema` which allows to define the collection data model by means of a JSON Schema.
The property `schema` in the configuration files is an _opt-in_ feature and when defined it takes precedence over the `fields` property.  
Though the latter property is still supported, it is recommended to convert your collections to adopt a JSON schema definition to access the new functionality offered by JSON schema.
- `$pull` operator support
- `$addToSet` supports mongo operators

### Deprecated

- Collections definition via `fields` property is now considered deprecated and it will be removed in future versions.

## 6.4.0 - 2023-03-21

### Added

- Support to [$addToSet](https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/) operations for array fields

### Changed

- Upgraded service libraries
- Refactored tests to further reduce their execution time and prevent tests timeouts
- Improved service documentation

## 6.3.0 - 2023-02-08

### Fixed

- .npmrc file added to .dockerignore and .gitignore

### Changed

- `README.md` improved with instructions on how to run the service in a local environment and how to configure collections and views;
- Refactored `./tests` folder to support parallel run of tests in CI pipelines
- Improved description of API methods exposed in API specification;

## 6.2.0 - 2023-01-13

### Changed

- Dockerfile: remove `crud-service-base-image` and merge its configuration into crud-service image definition
- upgrade NodeJS to `v18`
- upgrade `mongodb-enterprise-cryptd` to `v5.0.14`
- upgrade `libmongocrypt` to `v1.6.2-0`

## 6.1.4 - 2023-01-10

### Changed

- Removal of references to Mia s.r.l. internal documents, minor updates on the code for readability
- JSON definitions of MongoDB Views does not require the property `type` anymore (it will be automatically added with the `view` value)

## 6.1.3 - 2022-12-02

### Fix

- `ALLOW_DISK_USE_IN_QUERIES` supports `/count` operations

## 6.1.2 - 2022-11-24

### Fix

### Changed

- Fields stored as string are casted to number if requested by schema 

## 6.1.1 - 2022-11-22

### Changed

- support for `$dateToString` project operator in `_rawp` query param.

## 6.1.0 - 2022-11-22

- The CRUD Service officially supports MongoDB v6.0. See the [official MongoDB release note](https://www.mongodb.com/docs/manual/release-notes/6.0-compatibility/) for more information.

## 6.0.2 - 2022-10-25

### Added

- Add new environment variable `ALLOW_DISK_USE_IN_QUERIES` to set `allowDiskUse` option in MongoDB queries, useful when working with MongoDB Views (works with MongoDB >= 4.4).

## 6.0.1 - 2022-10-06

### Added

- Added header `json-query-params-encoding` for the json query params encoding.

### Deprecated

- the header `json_query_params_encoding` is marked as deprecated and its support is going to be dropped in the next major release.

## 6.0.0 - 2022-09-23

### BREAKING CHANGES

- `Ajv` major upgrade to v8. Look at its [release notes](https://github.com/ajv-validator/ajv/releases/tag/v8.0.0).
- Remove multi-type definition for nullable objects, in order to favor the `nullable` property.
  The service expected behavior will be equivalent, but the API Schemas will change if compared to the previous versions.
- Refactored Partial Indexes configuration properties

### Fixed

- object `nullable` field attribute is now recognized
- array `nullable` field attribute is now recognized
- export route works also when an array field is set to null
- failing tests on Mongo encryption lib

### Changed

- Refactored Partial Indexes configuration properties, in order to be more aligned to what is displayed on the Console Frontend
- replaced deprecated `fastify-mongodb` and `fastify-env` with their respective
namespace scoped version `@fastify/mongodb` and `fastify/env`
- remove multi-type definitions (`["<type>", "null"]`) to exploit only `nullable` attribute
when defining that a property can be set to `null`
- replace `standard` and `snazzy` with Mia `eslint` configuration,
refactoring code where needed to match the latest code styles
- set Fastify to use Ajv v8 compiler
- upgraded Ajv to v8, adopting its newer (and stricter) default configs.
This required to review source code and tests according to the [migration guide](https://ajv.js.org/v6-to-v8-migration.html).
- upgraded service dependencies

### Add

- Added support for base64 encoded (json) query params to support the ODI HTTP Client
- Added support to partial indexes

## 5.4.2 - 2022-07-28

### Fixed

- Fixed $currentDate operator behavior for patchById, patchMany, patchBulk and upsertOne APIs

## 5.4.1 - 2022-07-18

- security fixes

## 5.4.0 - 2022-06-22

### Add

- Add new _rawp's operators: $eq, $gt, $gte, $lt, $lte, $ne, $nin, $and, $not, $nor, $or, $exists, $type, $all, $elemMatch, $size, $cond, $regexMatch, $map, $mod

- Add the *CRUD_MAX_LIMIT* environment variable, for setting up the maximum limit of object per query

### Updated

- Docker Image base file @1.1.1

## 5.3.1 - 2022-05-30

### Updated

- `standard`@^17.0.0

### Fixed

- prevent query with empty object in `$and` to avoid full scan

## 5.3.0 - 2022-05-12

### Added

- sorting by nested and multiple fields

### Updated

- lc39 to v6.0.0

### Fixed

-  Throw error on findAll stream error event

## 5.2.3 - 2022-05-04

### Fixed

- removed check on text indexes presence when $text operator is used, mongodb performs the check by itself

## 5.2.2 - 2022-04-22

### Fixed

- resolved a regression introduced in version 5.1.0. Now all of the endpoints of a collection are correctly exposed.

## 5.2.1 - 2022-03-30

### Fixed

- null values in `_q` query filter are correctly handled for GET endpoints

## 5.2.0 - 2022-03-29

### Added

- support for `$first` project operator in `_rawp` query param

## 5.1.0 - 2022-03-21 [Found regression in this version on date 2022-04-22]

### Added

- supports MongoDB views

## 5.0.2 - 2022-02-25

### Updated

- mongocryptd v2

## 5.0.1 - 2021-11-08

### Fixed

- added pino to dependencies
- remove async from get list handler

### Updated

- node.js to v16
- dependency pino to ^7.1.0

### Chores

- added tests and improved documentation

## 5.0.0 - 2021-10-15

### BREAKING CHANGES

This version brings Mongo breaking changes from Mongo v4.4 to v5. Specially, if you are using some query (e.g. with `_q` parameter) no more supported by new Mongo version or new driver version, it will return an error.

Known limitation in this version:

- before, it would be possible to make a count using `$nearSphere` operator. This operator is not permitted by mongo v4.4 and mongo v5, so in this version the count with this filter will throw.

### Added

- support to mongo v5.0

### Updated

- update mongo driver to use v4
- handle mongo stream error in findAll

## 4.4.0 - 2021-09-30

### Added
- Client side field level encryption

### Fixed

- Corrected JSON schema for text indexes.
- Corrected some logs that were not showing objects
- PATCH: $.merge operator on multiple nested array

## 4.3.0 - 2021-09-10

### Updated

- Upgraded `lc39` to version 5 (handled with retrocompatibility by setting swagger in order to avoid breaking changes)

### Added

- new parameter `_rawp` to perform raw projections with aggregation operators on MongoDB v4.4 or above
- error handling for `_rawp` trying to override `acl_read_columns` header
- check on not allowed operators used during `_rawp`

### Changed

- Changed base image from `node:12.22.3-alpine` to `node:14.17.6-slim`
- Installed version 4.4.8 of `mongocryptd` inside the Docker image
- Installed version 1.2.2 of `libmongocrypt` inside the Docker image
- Upgrade node version in `nvm`
- Required node engine is now v14.17.6
- Inserted `KMS` configuration variables

## 4.2.0 - 2021-08-05

### Added

- support to text search indexes (with weights and language options) and $text queries on findAll

## 4.1.0 - 2021-07-06

### Changed

- projection regex pattern is removed in order to allow the projection over nested fields.

## 4.0.0 - 2021-06-17

## 3.3.0 - 2021-06-17  [Unpublished]

### Added
- support `__STATE__` change of multiple documents using a filter and without knowing the `_id` of each one.

### Breaking Change

- installed `@mia-platform/mongodb-healthchecker` for mongo healthchecks

## 3.2.3 - 2021-04-29

### Fixed
- fix `checkNormalIndexEquality` comparison

## 3.2.2 - 2021-03-04

### Updated

- lc39 v3.3.0

## 3.2.1 - 2021-01-29

### Fixed
- patch with unset of ObjectId field no longer fails

## 3.2.0 - 2020-12-02

### Added
- support json schema for RawObject and array of RawObject field properties

## 3.1.2 - 2020-11-04

### Added
- castToObjectId allow also null value as input and return null itself.

## 3.1.1

### Updated

- lc39 v3.1.4
- Updated gitlab-ci.yml mongo dependency, from this version mongo 4.4 support is guaranteed.

## 3.1.0 - 2020-10-06

### Added

 - Allow $inc, $set, $unset on sub properties of raw object

## 3.0.1 - 2020-10-02

### Update
- update lc39 to v3.1.3. 

## 3.0.0 - 2020-09-29

### Update

**BREAKING CHANGE**

- lc39 to v3.1.2. The update is breaking since it's bringing up lc39 v3.x with the newer logging format.

## 2.2.0 - 2020-07-14

### Added
- Expose some metrics about collections

### Update
- lc39 to v3.1.0

## 2.1.6 - 2020-05-26

### Fixed
- Omit required if empty

## 2.1.5 - 2020-05-26

**BROKEN: do not use this version**

## 2.1.4 - 2020-04-15

### Changed
- Remove default limit from /export

## 2.1.3 - 2020-01-31

### Changed

- Update package-lock for zero-downtime
- passing `{useUnifiedTopology: false}` to fastify-mongo to avoid that isConnected() always return true

## 2.1.1 - 2019-12-16

### Fix

- fix CRUD startup with 0 collections

## 2.1.0 - 2019-12-09

### Added

- handle ttl index
- support _id of type string

## 2.0.1 - 2019-10-16

### Fix
- Fixed missing data in __STATE__ field of post and post-bulk json schema

## v2.0.0 - 2019-07-03

### BREAKING CHANGE
- Implement nullable flag.
  Before this, the nullable flag is ignored. The default behavior is to convert `null` into falsy value for the field type type.
  For example, for an integer `null` value is converted to `0`, for a string to `''` (empty string).

### Added
- Both the handlers of `/-/check-up` and `/-/healthz` route check the connection to Mongo.


## v1.2.0 (Jun 25, 2019)
### Added:
  - Support for the CRUD_LIMIT_CONSTRAINT_ENABLED env variables to enable constraints on minimum,
    maximum and default values. New limits are: maximum 200, minimum 1 and default 25

## v1.1.0

Changes that have landed in master but are not yet released.

### Added:
  - Support for patching array items. The `$set` command works properly on both primitive and `RawObject` item types, by using `array.$.replace` and `array.$.merge` as keys in the `$set` command object.
  This feature involves the following CRUD operations:
    - Patch by ID
    - Patch many
    - Patch bulk
  - `array.$.replace` Replace entirely the query-matching array item with the content passed as value.
  - `array.$.merge`   Edits only the specified fields of the query-matching array item with the content passed as value.

See below for some sample cURLs for **/PATCH** */books-endpoint/{:id}*   where ```_q={"attachments.name": "John Doe", _st: "PUBLIC"}```

**Case Merge**
```
curl -X PATCH "http://crud-service:3000/books-endpoint/5cf83b600000000000000000?_q=%7B%22attachments.name%22%3A%20%22John%20Doe%22%7D&_st=PUBLIC" -H "accept: application/json" -H "Content-Type: application/json" -d "{ "$set": { "attachments.$.merge": { "name": "renamed attachment" } }}"

```
**Case Replace**
```
curl -X PATCH "http://crud-service:3000/books-endpoint/5cf83b600000000000000000?_q=%7B%22attachments.name%22%3A%20%22John%20Doe%22%7D&_st=PUBLIC" -H "accept: application/json" -H "Content-Type: application/json" -d "{ "$set": { "attachments.$.replace": { "name": "renamed attachment", content: "Lorem ipsum dolor sit amet", "state": "attached" } }}"
```
