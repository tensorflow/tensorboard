// Copyright 2019 The TensorFlow Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ==============================================================================

// Generic example of a service that provides data.

/** @type {?Object<string, !Array<string>>} */
let runToTagInfo = null;

async function updateRunInfo() {
  if (!runToTagInfo)
    runToTagInfo = await fetchJSON('./tags') || {};
}

/**
 * @return {!Promise<?Array<string>>}
 */
export async function getRuns() {
  await updateRunInfo();
  return Object.keys(runToTagInfo);
}

/**
 * @param {string} run
 * @return {!Promise<?Array<string>>}
 */
export async function getTags(run) {
  await updateRunInfo();
  return runToTagInfo[run];
}

/**
 * @param {string} run
 * @param {string} tag
 * @return {!Promise<?Object>}
 */
export async function getScalars(run, tag) {
  return await fetchJSON(`./scalars?run=${run}&tag=${tag}`);
}

/**
 * @param {string} url
 * @return {!Promise<?Object>}
 */
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return response.json();
}
