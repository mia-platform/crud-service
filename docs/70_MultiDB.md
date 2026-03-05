# Multi-DB — Multi-Database Support for CRUD Service

## Overview

The **Multi-DB** plugin extends CRUD Service to support **aggregate queries across N MongoDB databases** (called **scopes**), each reachable via its own connection string.

When `MULTIDB_ENABLED=true`, the **existing GET routes** (list, count, getById) are automatically replaced with scatter-gather versions that aggregate data from all scopes. URLs, query parameters, and ACL behavior remain unchanged. No dedicated routes are added: the multi-db flow is completely transparent.

When `x-scope` is **not provided**, all operations (read, write, delete, patch) target only **DEFAULT_SCOPE**. To operate on multiple scopes, the client must explicitly provide the `x-scope` header.

### Key Features

- **Transparent route interception**: existing CRUD routes are automatically replaced via Fastify `onRoute` hook.
- **Scatter-Gather with merge sort**: parallel queries across all scopes, with global merge sort on sort field + `_id`.
- **Keyset Pagination with Cursor Cache**: opaque base64url-encoded cursors via `x-cursor` response/request header. `_sk` (offset) is transparently translated to keyset cursors using a MongoDB-backed cursor cache on the DEFAULT_SCOPE database.
- **Graceful degradation**: if a scope errors out, the others continue to respond. The `X-Multidb-Degraded` HTTP header reports degraded scopes.
- **Scope filtering**: each request can optionally filter on a subset of scopes via the `x-scope` header.

---

### Request Flow (Scatter-Gather)

1. **Interception**: at startup, the `onRoute` hook detects GET list/count/getById routes and replaces their handlers with multi-db versions.
2. **Parsing**: the multi-db handler receives standard parameters (`_q`, `_s`, `_l`, `_p`, `_st`) plus the new `x-cursor` and `x-scope` headers.
3. **Scatter**: for each scope, a MongoDB query is built with:
   - The user filter (`_q`)
   - The document state filter (`__STATE__`)
   - The **keyset filter** derived from the cursor position for that scope
4. The N queries run **in parallel**.
5. **Gather**: results are tagged with `scope` and merged into a single array.
6. **Merge sort**: the merged array is sorted by `(sortField, _id)` respecting direction.
7. **Truncation**: only the first `limit` documents are emitted.
8. **Cursor computation**: for each scope that contributed to the page, the position of the last emitted document is saved (`sortValue` + `_id`).
9. **Encoding**: the cursor is serialized to JSON and encoded in base64url.
10. **Response**: JSON array (same as standard) + `x-cursor` response header.

---

## Configuration

### Environment Variables

| Variable | Type | Required | Default | Description |
|----------|------|:--------:|---------|-------------|
| `MULTIDB_ENABLED` | `boolean` | No | `false` | Enables the multi-db plugin. When `true`, existing GET routes use scatter-gather |
| `MULTIDB_SCOPES` | `string` | Yes* | — | List of scopes, comma-separated or as JSON array. E.g.: `"rome,milan,naples"` or `'["rome","milan","naples"]'` |
| `MULTIDB_URL_TEMPLATE` | `string` | Yes* | — | MongoDB connection string template with `{{scope}}` placeholder. E.g.: `mongodb+srv://user:pwd@cluster/myapp-prod-{{scope}}?retryWrites=true&w=majority` |
| `MULTIDB_MAX_IDLE_TIME_MS` | `number` | No | `0` | `maxIdleTimeMS` for scope MongoDB connections |
| `DEFAULT_SCOPE` | `string` | **Yes*** | — | **Required** when `MULTIDB_ENABLED=true`. The default scope used when `x-scope` header is not provided. All operations (read, write, delete, patch) target only this scope by default. Must be one of `MULTIDB_SCOPES`. Its database is also used for infrastructure purposes (cursor cache collection `_multidb_cursors`). Exposed as `fastify.multidb.defaultDb` |
| `CURSOR_TTL` | `number` | No | `300` | Time-to-live (seconds) for cursor cache entries in MongoDB. Cached cursors expire after this duration |
| `MAX_SKIP` | `number` | No | `2000` | Maximum `_sk` value allowed in multi-db GET list. Prevents deep pagination abuse |
| `MAX_REBUILD_PAGES` | `number` | No | `5` | Maximum pages to replay from page 0 when a cursor cache miss occurs. If the requested page exceeds this, a 410 Gone is returned |

> \* Required when `MULTIDB_ENABLED=true`.

### `.env` Example

```bash
MULTIDB_ENABLED=true
MULTIDB_SCOPES=rome,milan,naples
MULTIDB_URL_TEMPLATE=mongodb+srv://admin:secret@mycluster/myapp-prod-{{scope}}?retryWrites=true&w=majority
MULTIDB_MAX_IDLE_TIME_MS=30000
DEFAULT_SCOPE=rome
```

With this configuration, the plugin will create 3 MongoDB connections:
- `mongodb+srv://admin:secret@mycluster/myapp-prod-rome?...`
- `mongodb+srv://admin:secret@mycluster/myapp-prod-milan?...`
- `mongodb+srv://admin:secret@mycluster/myapp-prod-naples?...`

---

### Intercepted Routes — Scatter-Gather (aggregate reads)

The `x-scope` header is **optional**. If provided (comma-separated), filters on a subset of scopes. If omitted, **only DEFAULT_SCOPE** is queried.

| Original Route | Multi-DB Behavior |
|----------------|-------------------|
| `GET /:collectionName/` | Scatter-gather + keyset pagination → JSON array (same format as standard). Cursor in `x-cursor` response header |
| `GET /:collectionName/count` | Scatter-count → integer (total across target scopes) |
| `GET /:collectionName/:id` | Parallel search across target scopes → first match with `scope` |

### Intercepted Routes — Multi-Scope Fan-Out (PATCH)

The `x-scope` header is **optional**. If provided (comma-separated), only the listed scopes are patched. If omitted, **only DEFAULT_SCOPE** is patched.

| Original Route | Verb | Multi-DB Behavior |
|----------------|------|-------------------|
| `PATCH /:collectionName/:id` | PATCH | PATCH BY ID → fan-out across target scopes. Returns updated doc with `scope` field. 404 if not found in any scope |
| `PATCH /:collectionName/` | PATCH | PATCH MANY → fan-out across target scopes. Returns total `modifiedCount` summed across scopes |
| `PATCH /:collectionName/bulk` | PATCH | PATCH BULK → fan-out across target scopes. Returns total `modifiedCount` summed across scopes |

### Intercepted Routes — Proxy (single-scope operations)

The `x-scope` header is **optional**. If provided, targets that scope. If omitted, **DEFAULT_SCOPE** is used.

| Original Route | Verb | Multi-DB Behavior |
|----------------|------|-------------------|
| `POST /:collectionName/` | POST | INSERT → scoped collection via Proxy. Response includes `scope` |
| `POST /:collectionName/bulk` | POST | INSERT MANY → scoped collection. Response includes `scope` on each item |
| `POST /:collectionName/upsert-one` | POST | UPSERT → scoped collection. Response includes `scope` |
| `POST /:collectionName/:id/state` | POST | CHANGE STATE → scoped collection |
| `POST /:collectionName/state` | POST | CHANGE STATE MANY → scoped collection |
| `POST /:collectionName/import` | POST | IMPORT (file) → scoped collection |
| `PATCH /:collectionName/import` | PATCH | IMPORT UPSERT (file) → scoped collection |
| `DELETE /:collectionName/:id` | DELETE | DELETE BY ID → scoped collection |
| `DELETE /:collectionName/` | DELETE | DELETE MANY → scoped collection |
| `GET /:collectionName/export` | GET | EXPORT → scoped collection (streaming). Each streamed doc includes `scope` |
| `GET /` (lookup view) | GET | LOOKUP → scoped collection (aggregate). Each doc includes `scope` |

### Non-Intercepted Routes

| Route | Reason |
|-------|--------|
| `POST /:collectionName/validate` | Returns `{result: 'ok'}`, no DB access |
| `GET /:collectionName/schema` | Returns JSON Schema, not data — no modification needed |

---

## Differences from Standard Flow

### GET list (`GET /:collectionName/`)

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **Response format** | JSON array `[{...}, {...}]` | **Same** — JSON array `[{...}, {...}]` |
| **Pagination** | `_sk` (skip/offset) | `_sk` is transparently translated to keyset cursors via MongoDB cache. `x-cursor` header also accepted for direct keyset pagination |
| **`x-cursor` request header** | Not present | Added — opaque token from previous response |
| **`x-cursor` response header** | Not present | Added — opaque cursor for the next page (`null` if last page) |
| **`x-scope` header** | Not present | Added — optional, targets specific scopes. Defaults to DEFAULT_SCOPE |
| **`scope` field in documents** | Not present | Each document includes `scope` with the name of the originating scope |

### GET count (`GET /:collectionName/count`)

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **Response format** | Integer | Integer (sum across target scopes) |
| **`_useEstimate` parameter** | Supported | Accepted but **silently ignored** — estimate not supported across N databases |
| **`x-scope` header** | Not present | Added — optional, targets specific scopes. Defaults to DEFAULT_SCOPE |

### GET by ID (`GET /:collectionName/:id`)

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **Response format** | Single document | Document with `scope` added |
| **`x-scope` header** | Not present | Added — optional, limits search to specific scopes. Defaults to DEFAULT_SCOPE |
| **Search** | Single DB | Target scopes in parallel, returns first match |

### Write Operations (POST, DELETE)

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **Response format** | Unchanged | Each returned document includes `scope` with the target scope name. E.g. `{"_id": "...", "scope": "rome"}` |
| **`x-scope` header** | Not present | **Optional** — identifies the target database. Defaults to DEFAULT_SCOPE |
| **Handler logic** | Direct on `crudService._mongoCollection` | Proxy intercepts `_mongoCollection` → collection of the requested scope |
| **Concurrency** | — | Each request creates an isolated Proxy (no shared state) |

### PATCH Operations (multi-scope fan-out)

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **`x-scope` header** | Not present | **Optional** — comma-separated list of target scopes. If omitted, patches **DEFAULT_SCOPE** only |
| **PATCH by ID** | Patches one document | Fan-out: tries all target scopes, returns updated doc with `scope` field. 404 if not found in any scope |
| **PATCH many** | Returns `modifiedCount` | Fan-out: runs updateMany on all target scopes, returns **sum** of `modifiedCount` |
| **PATCH bulk** | Returns `modifiedCount` | Fan-out: runs bulkOp on all target scopes, returns **sum** of `modifiedCount` |
| **Concurrency** | — | Each scope query runs in parallel. Deep-cloned body for bulk to prevent mutation |

### Export and Lookup

| Aspect | Standard | Multi-DB |
|--------|----------|----------|
| **GET export** | Streaming from main DB | Streaming from scoped collection (`x-scope` header optional, defaults to DEFAULT_SCOPE). Each streamed document includes `scope` |
| **GET lookup (views)** | Aggregate from main DB | Aggregate from scoped collection (`x-scope` header optional, defaults to DEFAULT_SCOPE). Each returned document includes `scope` |

## Added Headers

The Multi-DB plugin uses **HTTP headers** for cursor and scope.

### `x-cursor` (GET list only)

The cursor is transported via HTTP headers in both directions:
- **Response**: the server sets the `x-cursor` response header with the opaque cursor for the next page. If absent or empty, there are no more pages.
- **Request**: the client sends the `x-cursor` request header to resume from the saved position.

This keeps the response body identical to the standard CRUD Service (a plain JSON array).

```bash
# First page — response includes x-cursor header if there are more pages
curl -D- "http://localhost:3000/tickets/?_s=-createdAt&_l=10"

# Next page — pass the x-cursor value from the previous response
curl "http://localhost:3000/tickets/?_s=-createdAt&_l=10" \
  -H "x-cursor: eyJ2Ijo...abc123"
```

### `x-scope` — reads (GET list, count, getById)

Filters the query on specific scopes (comma-separated). If omitted, **only DEFAULT_SCOPE** is queried.

```bash
# Only DEFAULT_SCOPE (x-scope omitted)
curl "http://localhost:3000/tickets/"

# Only data from Rome and Milan
curl "http://localhost:3000/tickets/" -H "x-scope: rome,milan"

# Count only on Naples
curl "http://localhost:3000/tickets/count" -H "x-scope: naples"

# Search document by ID only in the Rome scope
curl "http://localhost:3000/tickets/507f1f77bcf86cd799439011" -H "x-scope: rome"

# Search document by ID across ALL scopes
curl "http://localhost:3000/tickets/507f1f77bcf86cd799439011" -H "x-scope: rome,milan,naples"
```

If a requested scope does not exist in the configuration, it is ignored with a log warning. If **no** requested scope is valid, the system falls back to all scopes.

### `x-scope` — PATCH (multi-scope fan-out)

For **PATCH** operations, `x-scope` is **optional**. If provided (comma-separated), only the listed scopes are patched. If omitted, **only DEFAULT_SCOPE** is patched.

```bash
# Patch a document by ID on DEFAULT_SCOPE only (x-scope omitted)
curl -X PATCH "http://localhost:3000/tickets/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{"$set": {"priority": "low"}}'

# Patch many documents, but only in Rome and Milan
curl -X PATCH "http://localhost:3000/tickets/" \
  -H "x-scope: rome,milan" \
  -H "Content-Type: application/json" \
  -d '{"$set": {"priority": "low"}}'

# Patch many documents across ALL scopes (explicit)
curl -X PATCH "http://localhost:3000/tickets/" \
  -H "x-scope: rome,milan,naples" \
  -H "Content-Type: application/json" \
  -d '{"$set": {"status": "archived"}}'
```

Invalid scopes are logged as warnings and ignored. If no valid scope is provided, all scopes are used.

### `x-scope` — writes (POST, DELETE, export, lookup)

For **POST**, **DELETE**, **export** and **lookup** operations, `x-scope` is **optional**. If provided, it specifies the target scope. If omitted, **DEFAULT_SCOPE** is used.

```bash
# Insert a document in DEFAULT_SCOPE (x-scope omitted)
curl -X POST "http://localhost:3000/tickets/" \
  -H "Content-Type: application/json" \
  -d '{"name": "New ticket", "priority": "high", "__STATE__": "PUBLIC"}'

# Insert a document in the Milan scope (explicit)
curl -X POST "http://localhost:3000/tickets/" \
  -H "x-scope: milan" \
  -H "Content-Type: application/json" \
  -d '{"name": "New ticket", "priority": "high", "__STATE__": "PUBLIC"}'

# Delete a document from the Milan scope
curl -X DELETE "http://localhost:3000/tickets/507f1f77bcf86cd799439011" \
  -H "x-scope: milan"

# Export from DEFAULT_SCOPE (x-scope omitted)
curl "http://localhost:3000/tickets/export"

# Export from the Rome scope (explicit)
curl "http://localhost:3000/tickets/export" -H "x-scope: rome"
```

If the `x-scope` header contains a scope that does not exist in the configuration, **400 Bad Request** is returned.

---

## Response Examples

### GET list

The response body is a **plain JSON array**, identical to the standard CRUD Service format. The cursor and metadata are in response headers.

**Response headers:**
```
x-cursor: eyJ2IjoxLCJzb3J0RmllbGQiOiJjcmVhdGVkQXQi...abc123
X-Multidb-Degraded: naples          (only if a scope errored)
```

**Response body:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Urgent ticket",
    "createdAt": "2024-01-16T12:00:00Z",
    "priority": "high",
    "__STATE__": "PUBLIC",
    "scope": "naples"
  },
  {
    "_id": "507f1f77bcf86cd799439022",
    "name": "Support request",
    "createdAt": "2024-01-15T10:00:00Z",
    "priority": "medium",
    "__STATE__": "PUBLIC",
    "scope": "rome"
  }
]
```

**Response notes:**
- Each document includes the `scope` field indicating which database it came from.
- The `x-cursor` response header contains the opaque cursor for the next page. If absent, this is the last page.
- The `X-Multidb-Degraded` header lists scopes that returned errors (the others continue to work).

### GET count

The total is the sum of counts across all scopes (or only those specified by the `x-scope` header).

### GET by ID

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Urgent ticket",
  "createdAt": "2024-01-16T12:00:00Z",
  "__STATE__": "PUBLIC",
  "scope": "naples"
}
```

If the document is not found in any scope, returns `404 Not Found`.

---

## How Keyset Pagination Works

Traditional `skip/offset` pagination has a fundamental problem in the multi-database context: it is not possible to maintain a coherent offset across N distributed databases.

The plugin uses **keyset pagination** (also known as **cursor-based pagination**), which works as follows:

### First Page

```mermaid
sequenceDiagram
    participant C as Client
    participant H as Handler
    participant R as Scope Rome
    participant M as Scope Milan
    participant N as Scope Naples

    C->>H: GET /tickets/?_s=-createdAt&_l=5
    par Scatter (parallel queries)
        H->>R: find().sort().limit(5+1)
        H->>M: find().sort().limit(5+1)
        H->>N: find().sort().limit(5+1)
    end
    R-->>H: docs[ ] + hasMore?
    M-->>H: docs[ ] + hasMore?
    N-->>H: docs[ ] + hasMore?
    Note over H: Merge sort by (createdAt, _id)
    Note over H: Truncate to 5 documents
    Note over H: Save positions in cursor
    H-->>C: JSON array + x-cursor header
```

> **Why `limit + 1`?** Each scope executes `collection.find(query).sort(sort).limit(limit + 1)`.
> The extra document (+1) is never returned to the client: it is only used to determine
> whether that scope has **more data** beyond the current page. If the scope returns
> exactly `limit + 1` results, it means there is at least one more page and
> the `x-cursor` response header will contain the cursor for the next page.

### Next Page (with cursor)

When the client sends the cursor:
1. The cursor is **decoded** from base64url to JSON.
2. For each scope, a **keyset filter** is built:
   - If the sort is `createdAt DESC`:
     - `(createdAt < lastValue) OR (createdAt == lastValue AND _id > lastId)`
   - This ensures the database jumps directly to the right position with an **index scan**, without processing already-seen records.
3. The scatter-gather repeats from the new position.

### Cursor Properties

| Property | Detail |
|----------|--------|
| **Self-contained** | The cursor contains all necessary state, encoded in base64url. Any replica can decode it. |
| **Cached for `_sk` translation** | Cursors are also stored in a MongoDB collection (`_multidb_cursors`) to support `_sk` offset-based pagination. |
| **Multi-replica safe** | Any replica can decode it — no shared secrets required. |
| **Sort-locked** | Changing the sort field between pages raises an error, as it would invalidate positions. |

### Cursor Content (decoded)

```json
{
  "v": 1,
  "sortField": "createdAt",
  "sortDir": -1,
  "positions": {
    "rome": { "sortValue": "2024-01-10T08:00:00Z", "_id": "abc123" },
    "milan": { "sortValue": "2024-01-09T15:00:00Z", "_id": "def456" },
    "naples": null
  },
  "filter": {},
  "states": ["PUBLIC"]
}
```

- `positions[scope] = null` means that scope did not contribute documents in the previous page: the next query will restart from the previous position or from the beginning.
- `filter` and `states` are included in the cursor for integrity: if the client changes the filter, a new cursor is needed.

---

## Cursor Cache (`_sk` → Cursor Translation)

Clients that use traditional offset-based pagination (`_sk=0`, `_sk=20`, `_sk=40`, ...) are fully supported. The CRUD Service transparently translates `_sk` offsets to keyset cursors using a MongoDB-backed cache on the DEFAULT_SCOPE database.

### How it Works

```mermaid
sequenceDiagram
    participant C as Client
    participant H as CRUD Service
    participant DB as DEFAULT_SCOPE DB
    participant S as Scopes (scatter)

    C->>H: GET /tickets/?_sk=0&_l=20
    Note over H: page = _sk / _l = 0 (first page)
    H->>S: scatter-gather (no cursor needed)
    S-->>H: merged results + cursor
    H->>DB: cache cursor as p0
    H-->>C: JSON array (20 docs)

    C->>H: GET /tickets/?_sk=20&_l=20
    Note over H: page = _sk / _l = 1 → need p0 cursor
    H->>DB: lookup p0 cursor
    DB-->>H: cached cursor
    H->>S: scatter-gather with cursor
    S-->>H: merged results + cursor
    H->>DB: cache cursor as p1
    H-->>C: JSON array (20 docs)
```

### Cache Storage

| Property | Detail |
|----------|--------|
| **Collection** | `_multidb_cursors` on the DEFAULT_SCOPE database |
| **TTL** | Automatic cleanup via MongoDB TTL index on `expireAt` field (default: 300s, configurable via `CURSOR_TTL`) |
| **Key format** | `cursor:{collection}:{scope}:{sort}:{filter}:{state}:p{page}` |
| **Value** | The base64url-encoded cursor string for that page |

### Cache Miss Recovery

When a cursor is not found in cache (e.g., TTL expired), the service can **rebuild the cursor chain** by replaying pages from the beginning:

1. Execute page 0 (no cursor needed) → cache p0 cursor
2. Execute page 1 using p0 cursor → cache p1 cursor
3. Continue until the requested page is reached

This rebuild is limited by `MAX_REBUILD_PAGES` (default: 5) to prevent excessive load. If the requested page exceeds this threshold, the service returns **410 Gone** to signal the client to restart pagination from page 0.

### Error Responses

| Status | Condition |
|--------|-----------|
| **400** | `_sk` exceeds `MAX_SKIP` (default: 2000) |
| **410** | Cursor expired and page exceeds `MAX_REBUILD_PAGES` threshold |

### Direct Cursor Usage

Clients can bypass `_sk` translation entirely by using the `x-cursor` request header directly. When `x-cursor` is present, it takes priority over any `_sk` parameter. This is recommended for clients that can handle cursor-based pagination natively.

---

## Graceful Degradation

If one of the scopes is unreachable or returns an error:

1. The query **does not fail**: the other scopes continue to respond normally.
2. The `X-Multidb-Degraded` HTTP header contains the list of degraded scopes:

```
X-Multidb-Degraded: naples
```

This allows the UI to display a warning like *"Partial results: the naples scope is currently unavailable"*.

---

## Limits and Constraints

| Constraint | Detail |
|------------|--------|
| **Maximum page size** | 200 documents (`MAX_PAGE_SIZE`). Larger requests are truncated. |
| **Single field sort** | Only one sort field is supported with tie-breaking on `_id`. |
| **Immutable sort within session** | Changing sort field/direction between pages is not allowed. |
| **Identical collections** | The plugin assumes all scopes have the same collections with the same schema. |
| **No aggregation pipeline** | Queries use `find()` with sort/limit. For complex aggregations, use the CRUD Service APIs per scope directly. |
| **Eventual consistency** | Cross-scope results are eventually consistent: there is no global transaction. |
| **`_sk` → cursor translation** | The `_sk` offset parameter is transparently translated to keyset cursors using a MongoDB-backed cache (`_multidb_cursors` collection on DEFAULT_SCOPE). Existing clients using `_sk` pagination continue to work transparently. Direct `x-cursor` header is also supported for advanced use cases. |
| **`_useEstimate` silently ignored** | Count estimation is accepted but has no effect across N databases. |
| **Single-scope writes** | POST, DELETE default to DEFAULT_SCOPE when x-scope is omitted. |
| **Single-scope export/lookup** | GET export and lookup default to DEFAULT_SCOPE when x-scope is omitted. |

---

## Local End-to-End Execution

You can start the CRUD Service with multi-db enabled against a real MongoDB instance in Docker. This allows you to verify end-to-end behavior: scatter-gather, cursor pagination, single-scope writes, etc.

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js** >= 18
- Dependencies installed: `npm install`

### 1. Start MongoDB

```bash
npm run multidb:up
```

This starts a MongoDB 6.0 container on port `27017` via `docker-compose.multidb.yml`.

To verify it is running:

```bash
docker compose -f docker-compose.multidb.yml ps
```

### 2. Seed Test Data

```bash
npm run multidb:seed
```

The `scripts/seed-multidb.js` script creates three separate databases (`crud-rome`, `crud-milan`, `crud-naples`) and inserts sample documents into the `customers` and `items` collections:

| Database | customers | items |
|----------|:---------:|:-----:|
| `crud-rome` | 3 | 2 |
| `crud-milan` | 2 | 3 |
| `crud-naples` | 4 | 2 |

The script is idempotent: on each run it drops existing collections before reinserting data.

### 3. Start the CRUD Service

```bash
npm run start:multidb
```

The service starts on port `3000` with the configuration from `multidb.local.env`:

| Variable | Value |
|----------|-------|
| `MULTIDB_ENABLED` | `true` |
| `MULTIDB_SCOPES` | `rome,milan,naples` |
| `MULTIDB_URL_TEMPLATE` | `mongodb://localhost:27017/crud-{{scope}}` |
| `DEFAULT_SCOPE` | `rome` |
| `COLLECTION_DEFINITION_FOLDER` | `./bench/definitions/collections` |

### 4. Test the APIs

**GET list — DEFAULT_SCOPE only (x-scope omitted):**

```bash
curl -s http://localhost:3000/customers/ | jq
```

Returns documents from DEFAULT_SCOPE only (e.g. `rome` if `DEFAULT_SCOPE=rome`).

**GET list — scatter-gather across multiple scopes:**

```bash
curl -s -H "x-scope: rome,milan,naples" http://localhost:3000/customers/ | jq
```

Returns documents from all three scopes merged and sorted, with `x-cursor` header for pagination.

**GET list — filter by single scope:**

```bash
curl -s -H "x-scope: rome" http://localhost:3000/customers/ | jq
```

**GET count — aggregate count:**

```bash
curl -s http://localhost:3000/customers/count | jq
```

**GET by ID — search across all scopes:**

```bash
# Replace with a real _id from the seed
curl -s -H "x-scope: rome,milan,naples" http://localhost:3000/customers/000000000000000000000001 | jq
```

**POST — write to DEFAULT_SCOPE (x-scope omitted):**

```bash
curl -s -X POST http://localhost:3000/customers/ \
  -H "Content-Type: application/json" \
  -H "userid: test-user" \
  -d '{
    "customerId": "CUST-MI-999",
    "firstName": "Test",
    "lastName": "User",
    "gender": "M",
    "birthDate": "1990-01-01T00:00:00Z",
    "email": "test.user@example.com",
    "subscriptionNumber": "SUB-001",
    "shopID": 1,
    "purchasesCount": 0,
    "creditCardDetail": {
      "name": "Test User",
      "cardNo": 1234567890123456,
      "expirationDate": "12/28",
      "cardCode": "123"
    }
  }' | jq
```

**POST — write to a specific scope (explicit x-scope):**

```bash
curl -s -X POST http://localhost:3000/customers/ \
  -H "Content-Type: application/json" \
  -H "userid: test-user" \
  -H "x-scope: milan" \
  -d '{
    "customerId": "CUST-MI-999",
    "firstName": "Test",
    "lastName": "User",
    "gender": "M",
    "birthDate": "1990-01-01T00:00:00Z",
    "email": "test.user@example.com",
    "subscriptionNumber": "SUB-001",
    "shopID": 1,
    "purchasesCount": 0,
    "creditCardDetail": {
      "name": "Test User",
      "cardNo": 1234567890123456,
      "expirationDate": "12/28",
      "cardCode": "123"
    }
  }' | jq
```

The response includes `"scope": "milan"` confirming the target database.

**Cursor pagination:**

```bash
# First page (limited to 2 results) — show response headers with -D-
curl -s -D- "http://localhost:3000/customers/?_l=2"
# Look for the x-cursor response header in the output

# Next page — pass the x-cursor value from the previous response header
curl -s "http://localhost:3000/customers/?_l=2" \
  -H "x-cursor: <value-from-x-cursor-response-header>" | jq
```

### 5. Inspect Databases with mongosh

```bash
docker compose -f docker-compose.multidb.yml exec mongodb mongosh

# Inside mongosh:
show dbs
use crud-rome
db.customers.find()
use crud-milan
db.items.find()
```

### 6. Stop the Environment

```bash
# Stop the CRUD Service: Ctrl+C in the terminal

# Stop MongoDB (preserves data in the volume)
npm run multidb:down

# Stop AND remove data
docker compose -f docker-compose.multidb.yml down -v
```
