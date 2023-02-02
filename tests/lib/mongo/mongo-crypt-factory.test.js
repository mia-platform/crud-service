/*
 * Copyright 2023 Mia s.r.l.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const tap = require('tap')
const path = require('path')
const { StringDecoder } = require('string_decoder')

const cryptFactory = require('../../../lib/mongo/mongo-crypt-factory')

const buildFastifyInstance = (config) => ({ config })

tap.test('No kms provider tests', t => {
  t.test('undefined crypt configuration for none kms provider', t => {
    const fastify = buildFastifyInstance({ KMS_PROVIDER: 'none' })
    t.equal(cryptFactory(fastify), undefined)
    t.end()
  })

  t.end()
})

tap.test('GCP kms provider tests', t => {
  t.test('right crypt configuration for gcp kms provider', t => {
    const fastify = buildFastifyInstance({
      KMS_PROVIDER: 'gcp',
      KMS_GCP_PRIVATE_KEY_PATH: path.join(__dirname, '../oneLineKey.pem'),
      KMS_GCP_EMAIL: 'teo@gcp.com',
      KEY_VAULT_NAMESPACE: 'key.vault',
    })
    const expectedConfiguration = {
      keyVaultNamespace: 'key.vault',
      kmsProviders: {
        gcp: {
          email: 'teo@gcp.com',
          privateKey: 'MIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2JZfXJ/DgYSF6vUpwmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/3j+skZ6UtW+5u09lHNsj6tQ51s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh3tx4VgMtrQ+WEgCjhoTwo23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2pIIVOFMDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDeAw6fiIQXGukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9WaI+NRfcxUJrmfPwIGm63ilAkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF41hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlFL0NDt4SkosjgGwJAFklyR1uZ/wPJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5kX6zk7S0ljKtt2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2eplU9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cEGpb88h5NBYZzWXGZ37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6rCJ4p0=',
        },
      },
      extraOptions: {
        mongocryptdSpawnArgs: ['--logpath=/tmp/mongocryptd.log', '--pidfilepath=/tmp/mongocryptd.pid'],
      },
    }
    t.strictSame(cryptFactory(fastify), expectedConfiguration)
    t.end()
  })

  t.test('correctly insert schemaMap for gcp', t => {
    const fastify = buildFastifyInstance({
      KMS_PROVIDER: 'gcp',
      KMS_GCP_PRIVATE_KEY_PATH: path.join(__dirname, '../private_key.pem'),
      KMS_GCP_EMAIL: 'teo@gcp.com',
      KEY_VAULT_NAMESPACE: 'key.vault',
    })
    const schemaMap = {
      bsonType: 'object',
      properties: {
        reservedStringD: {
          encrypt: {
            keyId: 'abcdefg',
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
          },
        },
      },
    }
    const expectedConfiguration = {
      keyVaultNamespace: 'key.vault',
      kmsProviders: {
        gcp: {
          email: 'teo@gcp.com',
          privateKey: `MIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2JZfXJ/DgYSF6vUp
wmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/3j+skZ6UtW+5u09lHNsj6tQ5
1s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh
3tx4VgMtrQ+WEgCjhoTwo23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2
pIIVOFMDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDeAw6fiIQX
GukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9WaI+NRfcxUJrmfPwIGm63il
AkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF41hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlF
L0NDt4SkosjgGwJAFklyR1uZ/wPJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5k
X6zk7S0ljKtt2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2epl
U9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cEGpb88h5NBYZzWXGZ
37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6rCJ4p0=`,
        },
      },
      extraOptions: {
        mongocryptdSpawnArgs: ['--logpath=/tmp/mongocryptd.log', '--pidfilepath=/tmp/mongocryptd.pid'],
      },
      schemaMap,
    }
    t.strictSame(cryptFactory(fastify, schemaMap), expectedConfiguration)
    t.end()
  })

  t.end()
})

tap.test('Local kms provider tests', t => {
  t.test('right crypt configuration for local kms provider', t => {
    const fastify = buildFastifyInstance({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: path.join(__dirname, '../private_key.pem'),
      KEY_VAULT_NAMESPACE: 'key.vault',
    })
    const localCryptConfiguration = cryptFactory(fastify)
    const stringDecoder = new StringDecoder('utf-8')
    t.equal(localCryptConfiguration.keyVaultNamespace, 'key.vault')
    t.equal(stringDecoder.write(localCryptConfiguration.kmsProviders.local.key), '-----BEGIN PRIVATE KEY-----\n'
      + 'MIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2JZfXJ/DgYSF6vUp\n'
      + 'wmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/3j+skZ6UtW+5u09lHNsj6tQ5\n'
      + '1s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh\n'
      + '3tx4VgMtrQ+WEgCjhoTwo23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2\n'
      + 'pIIVOFMDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDeAw6fiIQX\n'
      + 'GukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9WaI+NRfcxUJrmfPwIGm63il\n'
      + 'AkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF41hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlF\n'
      + 'L0NDt4SkosjgGwJAFklyR1uZ/wPJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5k\n'
      + 'X6zk7S0ljKtt2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2epl\n'
      + 'U9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cEGpb88h5NBYZzWXGZ\n'
      + '37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6rCJ4p0=\n'
      + '-----END PRIVATE KEY-----\n')
    t.equal(localCryptConfiguration.schemaMap, undefined)
    t.end()
  })

  t.test('correctly insert schemaMap for local', t => {
    const schemaMap = {
      bsonType: 'object',
      properties: {
        reservedStringD: {
          encrypt: {
            keyId: 'abcdefg',
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
          },
        },
      },
    }
    const fastify = buildFastifyInstance({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: path.join(__dirname, '../private_key.pem'),
      KEY_VAULT_NAMESPACE: 'key.vault',
    })
    const localCryptConfiguration = cryptFactory(fastify, schemaMap)
    const stringDecoder = new StringDecoder('utf-8')
    t.equal(localCryptConfiguration.keyVaultNamespace, 'key.vault')
    t.equal(stringDecoder.write(localCryptConfiguration.kmsProviders.local.key), '-----BEGIN PRIVATE KEY-----\n'
      + 'MIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2JZfXJ/DgYSF6vUp\n'
      + 'wmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/3j+skZ6UtW+5u09lHNsj6tQ5\n'
      + '1s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh\n'
      + '3tx4VgMtrQ+WEgCjhoTwo23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2\n'
      + 'pIIVOFMDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDeAw6fiIQX\n'
      + 'GukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9WaI+NRfcxUJrmfPwIGm63il\n'
      + 'AkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF41hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlF\n'
      + 'L0NDt4SkosjgGwJAFklyR1uZ/wPJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5k\n'
      + 'X6zk7S0ljKtt2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2epl\n'
      + 'U9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cEGpb88h5NBYZzWXGZ\n'
      + '37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6rCJ4p0=\n'
      + '-----END PRIVATE KEY-----\n')
    t.equal(localCryptConfiguration.schemaMap, schemaMap)
    t.end()
  })

  t.end()
})
