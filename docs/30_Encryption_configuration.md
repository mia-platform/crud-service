# Encryption configuration

:::note
You must use this configuration only if you want to use Client Side Field Level Encryption (CSFLE) provided by MongoDB.
:::

Starting with version `4.4.0`, the `crud-service` has introduced the support for the [Client Side Field Level Encryption (**CSFLE**)](https://docs.mongodb.com/manual/core/security-client-side-encryption/).

:::warning
Be careful, CSFLE is a Mongo Enterprise feature, and requires at least MongoDB version 4.2.
:::

With CSFLE, the CRUD Service can encrypt fields in documents before transmitting the data to Mongo: this allows to store on database already encrypted data and can be used to obfuscate sensible data.

:::caution
CSFLE must not be used to store passwords.
:::

The keys and the data are stored in different collections and can even be stored in different databases: only with access to the correct encryption keys it's possible to decrypt and read the protected data.

For some data types (`Number`, `String`, `Date` and `ObjectId`) it is also possible to guarantee their searchability even if encrypted.

:::caution
Not all MongoDB operators are supported for encrypted fields.
Take a look to the [official documentation](https://docs.mongodb.com/manual/reference/security-client-side-query-aggregation-support/#supported-query-operators) for more details.
:::

## Keys relations

The keys used by the CSFLE feature are of two types:

- **data encryption key**: used to encrypt and decrypt the values of the fields marked for encryption. Each collection that contains documents with encrypted fields uses its specific data encryption key. Each data encryption key is stored inside a dedicated collection of the MongoDB instance.
- **master key**: data encryption keys are not stored as plaintext on MongoDB, but rather encrypted. The master key is used to encrypt and decrypt the data encryption keys. The Key Management Service (KMS) is the system responsible to manage the master key.

:::caution
Deleting an encryption key renders all data inside a collection encrypted using that key permanently unreadable, as it won't be possible to decrypt them anymore.
:::

## Configuration
In order to guarantee a correct data encryption, it is necessary to configure a Key Management Service.
Currently, we support two different KMS: `Local` and [Google Cloud Key Management](https://cloud.google.com/security-key-management) (available from Google Cloud Platform).

To configure the CRUD Service in order to enable CSFLE it is necessary to add some environment variables to the configuration.
To add the environment variables, please refer to [the dedicated section](https://docs.mia-platform.eu/docs/development_suite/set-up-infrastructure/env-var).

### Configure CSFLE with the Google Cloud Platform (GCP)

:::note
Keep in mind that a KMS provided by GCP has additional costs.
Take a look at the [official documentation](https://cloud.google.com/kms/pricing) to find out the cost and the related billing logic.
:::

In order to configure the encryption using the Google KMS, you need the
[KMS service account json configuration](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
and the [KMS endpoint](https://cloud.google.com/kms/docs/reference/rest#rest-resource:-v1.projects.locations.keyrings.cryptokeys).

And here is an example of the KMS endpoint:
`projects/{project_id}/locations/{location}/keyRings/{keyRingName}/cryptoKeys/{keyName}`

With these configurations at hand, you can now configure the environment variables for the CRUD Service:

| Variable                      | Type    | Required | Default value              | Description                                                                  |
|-------------------------------|---------|----------|----------------------------|------------------------------------------------------------------------------|
| KMS_PROVIDER                  | `gcp`   | Required | -                          | the type of provider used as key Manager Service. It has to be the string `gcp` to use Google Cloud Platform |
| KMS_GCP_EMAIL                 | String  | Required | -                          | service account e-mail of the KMS. |
| KMS_GCP_PROJECT_ID            | String  | Required | -                          | GCP project id in which is configured the KMS. It corresponds to the `project_id` in the KMS service account json configuration. |
| KMS_GCP_LOCATION              | String  | Required | -                          | Location in which the KMS is running. It corresponds to the `location` in the KMS endpoint (e.g. if the endpoint is `projects/:projectId/locations/:location/keyRings/:keyRing/cryptoKeys/:cryptoKey`, you must enter as the value of the variable `:location`).|
| KMS_GCP_KEY_RING              | String  | Required | -                          | GCP keyring used by the KMS. It corresponds to the `keyRingName` in the KMS endpoint (e.g., if the endpoint is `projects/:projectId/locations/:location/keyRings/:keyRing/cryptoKeys/:cryptoKey`, you must enter as the value of the variable `:keyRing`). |
| KMS_GCP_KEY_NAME              | String  | Required | -                          | GCP key name. It corresponds to the `keyName` in the KMS endpoint (e.g., if the endpoint is `projects/:projectId/locations/:location/keyRings/:keyRing/cryptoKeys/:cryptoKey`, you must enter as the value of the variable `:cryptoKey`).|
| KMS_GCP_PRIVATE_KEY_PATH      | String  | Required | -                          | Path in which is stored the private key, on the console you **must** mount it as `ConfigMap`. The content of this private key corresponds to the **formatted** `private_key` in the KMS service account json configuration.|
| KEY_VAULT_NAMESPACE           | String  | Required | -                          | where the key used for the collection encryption will be stored. **The required format is `{databaseName}.{collectionName}`**. (e.g.: if the database name is `myDatabase` and the collection name is `testCollection`, you must enter as the value of the variable `myDatabase.testCollection`.) |

:::warning
To ensure that encryption keys are stored correctly, verify that CRUD service has the permissions to create and access the database and collection specified in `KEY_VAULT_NAMESPACE` variable.
:::

### Configure CSFLE with Local Key
:::caution
**The `local` KMS is not recommended for production.**
:::

In order to configure the encryption using the Local KMS it's necessary to add these new variables:

| Variable                      | Type    | Required | Default value              | Description                                                                  |
|-------------------------------|---------|----------|----------------------------|------------------------------------------------------------------------------|
| KMS_PROVIDER                  | `local` | Required | -                          | the type of provider used as key Manager Service. It has to be the string `local` to use a local KMS |
| LOCAL_MASTER_KEY_PATH         | String  | Required | -                          | Path where the master key is stored. This path **must be mounted** as `ConfigMap`. To generate it, please read [the following guide](#local-master-key-generation). |
| KEY_VAULT_NAMESPACE            | String  | Required | -                          | where the key used for the collection encryption will be stored. **The required format is `{databaseName}.{collectionName}`**. (e.g.: if the database name is `myDatabase` and the collection name is `testCollection`, you must enter as the value of the variable `myDatabase.testCollection`.) |

* **KMS_PROVIDER** (*enum: `local`*): the key is managed using a local master key.
* **LOCAL_MASTER_KEY_PATH**: Path where the master key is stored. This path **must be mounted** as `ConfigMap` on the console. To generate it, please read [the following guide](#local-master-key-generation).
* **KEY_VAULT_NAMESPACE**: where the key used for the collection encryption will be stored. **The required format is `{databaseName}.{collectionName}`**.

:::warning
To ensure that encryption keys are stored correctly, verify that CRUD service has the permissions to create and access the database and collection specified in `KEY_VAULT_NAMESPACE` variable.
:::

#### Local master key generation
The local master key must have the exact size of 96 bytes.

You can generate it randomly with a `NodeJS` script or with a shell command.

Alternatively, you can create your own string of length 96 characters.

#### How to generate a local master key using NodeJS
```js
const fs = require('fs')
const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateString(length) {
  let result = ''
  const charactersLength = characters.length
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

try {
  fs.writeFileSync('YOUR_KEY_PATH', generateString(96))
} catch (err) {
  console.error(err)
}
```

#### How to generate a local master key using Shell Command
```shell
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 96 | head -n 1 > YOUR_KEY_PATH
```

## Migration and change of the configurations

:::note
We recommend activating the encryption only for new fields.
:::

It is possible to enable or disable the encryption of an already existing field, although this operation requires a manual action on the data. Such action is necessary to keep applications relying on those field correctly up and running.
This manual action involves both physically update stored data and CRUD configuration.

In order to achieve this goal please follow these instructions:

- extract through CRUD all the records from the collection of concern, so that values are available
- open in the Console the CRUD section of your project and select the interested CRUD collection
- export existing CRUD collection configuration (to potentially use it later)
- delete existing fields that should become encrypted/unencrypted
- recreate those field enabling or disabling the Client Side Encryption depending on the use case
(it is possible to import the previously downloaded config to simplify fields creation)
- commit and deploy the new configuration
- import through CRUD the records that were previously exported, so that they are store using the correct encryption level

## Nested objects
Besides plain fields, it is also possible to encrypt objects and their content;
however, doing this we have some limitations:

- objects are encryptable but not searchable while encrypted
- to encrypt an object, all of its properties must **not** be encrypted

### Activate object encryption
In order to activate object encryption, you **must** insert the `encryption` object in your JSON schema, at same level of the `properties` or `type` key.

For example, if you have the following schema:

```json
{
  "type": "object",
  "properties": {
    "testProperty": {
      "type": "string"
    }
  }
}
```

And you want to activate the encryption for the **entire object** (that is **not** searchable), you **must** add:
```json
"encryption": {"enabled": true, "searchable": false}
```

So your final schema would be:

```json
{
  "type": "object",
  "properties": {
    "testProperty": {
      "type": "string"
    }
  },
  "encryption": {
    "enabled": true,
    "searchable": false
  }
}
```

Instead, if you want to activate encryption only for the property `testProperty`, and **make it searchable**, you **must** add:
```json
"encryption": {
  "enabled": true, 
  "searchable": true
}
```

inside the property definition.

So your final schema would be:

```json
{
  "type": "object",
  "properties": {
    "testProperty": {
      "type": "string",
      "encryption": {
        "enabled": true,
        "searchable": true
      }
    }
  }
}
```
