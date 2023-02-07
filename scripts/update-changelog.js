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

const { join } = require('path')
const { readFileSync, writeFileSync } = require('fs')

function getISODateStringFrom(aJSDate) {
  return aJSDate
    .toISOString()
    .split('T')
    .shift()
}

function getNewContentForCHANGELOG({ aSemVerString, anISODateString }) {
  return `[Unreleased]\n\n## ${aSemVerString} - ${anISODateString}`
}

const CHANGELOG_PATH = join(__dirname, '../CHANGELOG.md')

let changelog = readFileSync(CHANGELOG_PATH, { encoding: 'utf-8' })

changelog = changelog.replace('[Unreleased]', getNewContentForCHANGELOG({
  aSemVerString: process.argv[2],
  anISODateString: getISODateStringFrom(new Date()),
}))

writeFileSync(CHANGELOG_PATH, changelog)
