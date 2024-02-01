# Migration Guide to V7

This document describes the breaking changes introduced with the new version v7.0.0 of the CRUD Service
and how they should be tackled in order to safely upgrade CRUD Service version.

### MongoDB Support [#189](https://github.com/mia-platform/crud-service/pull/189)

With this new release of CRUD Service it is introduced the support to Mongo v7, while
the support to MongoDB v4.2 was dropped. For this reason, while the service may still
work with such MongoDB version, it is recommended to upgrade your MongoDB cluster version
to v4.4. or higher to ensure full compatibility with CRUD Service.

For more details on CRUD Service compatibility with MongoDB, please visit the Marketplace
[_compatibility matrix_](https://docs.mia-platform.eu/docs/marketplace/compatibility_matrices/mongo_compatibility_matrix).

### Duplicated Key Response Error Code [#140](https://github.com/mia-platform/crud-service/pull/140)

Following the discussion CRUD Service response on [unique constraint violation](https://github.com/mia-platform/community/discussions/175), it has been decided
to change the returned HTTP error code from `422 Unprocessable Entity` to `409 Conflict`.
This modification should improve the clarity on what happened to the requested operation.

In order to safely migrate the CRUD Service version, it is important to ensure that all
the applications depending on the specific response code, returned in case of duplicate
key, are appropriately modified to accept the new response code.

### Disallowed State Transition Error Code [#122](https://github.com/mia-platform/crud-service/pull/122)

As discussed in issue [#53](https://github.com/mia-platform/crud-service/issues/53), it has
been decided to change the returned HTTP error code from `404 Not Found` to `400 Bad Request`.
This modification should improve the clarity on what happened to the requested operation.

In order to safely migrate the CRUD Service version, it is important to ensure that all
the applications depending on the specific response code, returned in case of duplicate
key, are appropriately modified to accept the new response code.

### Access to Fields Outside the Collection Schema Model [#127](https://github.com/mia-platform/crud-service/pull/127) | [#144](https://github.com/mia-platform/crud-service/pull/144)

In response to issue [#55](https://github.com/mia-platform/crud-service/issues/53), the access
to collection properties has been enforced to cover only fields defined in the collection schema model.
Requesting to access an unexpected field now returns an HTTP error `400 Bad request`. At
the same time, when requesting documents via `GET /<collection>/` and `GET /<collection>/:id` endpoints,
properties that may be available on the collection documents but that are not explicitly defined
in the collection schema model are removed from the actual response body.

In order to safely migrate the CRUD Service version, it is important to ensure that either:
- all the applications depending on this specific behavior are modified appropriately
- the collections model definition is reviewed and potentially updated to include all the fields actually required by the applications