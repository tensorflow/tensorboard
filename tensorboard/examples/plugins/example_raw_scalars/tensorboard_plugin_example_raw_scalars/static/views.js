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
// =============================================================================

// Generic view builders.

/**
 * @param {!Map<string, !Array<Object>>} tagsToScalars
 * @return {!DocumentFragment}
 */
export function createPreviews(tagsToScalars) {
  const fragment = document.createDocumentFragment();

  if (!tagsToScalars.size) {
    const messageElement = createElement('h2');
    messageElement.textContent = 'No tags found.';
    fragment.appendChild(messageElement);
    return fragment;
  }

  /**
   * For each tag, build UI in this form:
   *   <div class="preview">
   *     <div class="tagname">${tag}</div>
   *     <textarea class="preview-text">${result}</textarea>
   *   </div>
   */
  for (let [tag, scalars] of tagsToScalars) {
    const previewEl = createElement('div', 'preview');
    const tagNameEl = createElement('div', 'tagname');
    const textPreviewEl = createElement('textarea', 'preview-text');
    tagNameEl.textContent = tag;
    textPreviewEl.textContent = scalars
      ? JSON.stringify(scalars)
      : 'No scalar data found.';
    previewEl.appendChild(tagNameEl);
    previewEl.appendChild(textPreviewEl);
    fragment.appendChild(previewEl);
  }
  return fragment;
}

/**
 * @param {!Array<string>} runs
 * @return {!HTMLSelectElement}
 */
export function createRunSelector(runs) {
  /**
   * Build a component in this form:
   *   <select class="run-selector">
   *     <option value="${run}">${run}</option>
   *     ...
   *   </select>
   */
  const element = createElement('select', 'run-selector');
  for (const run of runs) {
    element.options.add(new Option(run, run));
  }

  return element;
}

/**
 * @param {string} tag
 * @param {string=} className
 * @return {!Element}
 */
function createElement(tag, className) {
  const result = document.createElement(tag);
  if (className) {
    result.className = className;
  }
  return result;
}
