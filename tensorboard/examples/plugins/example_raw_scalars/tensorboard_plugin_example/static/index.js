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

import * as Model from './model.js';

/**
 * The main entry point of any TensorBoard iframe plugin.
 */
export async function render() {
  const runs = await Model.getRuns();
  if (!runs) {
    document.body.innerHTML = `<h1>No runs found.</h1>`;
    return;
  }

  document.body.innerHTML = `
    <link rel="stylesheet" href="./static/style.css" />

    <h1>Example plugin - Select a run</h1>
    <select id="run-selector"></select>
    <div id="preview-container"></select>
  `;

  // Building a run selector.
  const selectEl = document.querySelector('#run-selector');
  for (const run of runs) {
    selectEl.options.add(new Option(run, run));
  }

  // Load data previews when a run is selected.
  selectEl.onchange = updatePreview;
  updatePreview();

  async function updatePreview() {
    const run = selectEl.value;
    const tags = await Model.runToTags(run);
    const previewContainerEl = document.querySelector('#preview-container');
    if (!tags.length) {
      previewContainerEl.innerHTML = `<h2>No tags found.</h2>`;
      return;
    }
    previewContainerEl.innerHTML = `<h2>Loading...</h2>`;

    // Render the resulting scalars inside a <textarea>.
    let newHTML = '';
    for (let tag of tags) {
      const scalars = await Model.getScalars(run, tag);
      const result = scalars ? JSON.stringify(scalars) : 'No scalar data found.';
      const previewTemplate = `
        <div class="preview">
          <div class="tagname">${tag}</div>
          <textarea class="preview-text">${result}</textarea>
        </div>
      `;
      newHTML += previewTemplate;
    }
    if (selectEl.value === run)
      previewContainerEl.innerHTML = newHTML;
  }
}
