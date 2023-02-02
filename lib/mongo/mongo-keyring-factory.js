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

const factories = {
  gcp: ({ config }) => {
    const { KMS_GCP_PROJECT_ID, KMS_GCP_LOCATION, KMS_GCP_KEY_RING, KMS_GCP_KEY_NAME } = config
    return {
      masterKey: {
        projectId: KMS_GCP_PROJECT_ID,
        location: KMS_GCP_LOCATION,
        keyRing: KMS_GCP_KEY_RING,
        keyName: KMS_GCP_KEY_NAME,
      },
    }
  },
}

const retrieveKeyRing = ({ config }) => {
  const { KMS_PROVIDER } = config
  const factory = factories[KMS_PROVIDER]
  return factory ? factory({ config }) : {}
}

module.exports = retrieveKeyRing
