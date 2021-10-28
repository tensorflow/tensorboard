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

export async function render() {
  const msg = createElement('p', 'Fetching data…');
  document.body.appendChild(msg);

  const runToTags = await fetch('./tags').then((response) => response.json());
  const data = await Promise.all(
    Object.entries(runToTags).flatMap(([run, tagToDescription]) =>
      Object.keys(tagToDescription).map((tag) =>
        fetch('./greetings?' + new URLSearchParams({run, tag}))
          .then((response) => response.json())
          .then((greetings) => ({
            run,
            tag,
            greetings,
            description: tagToDescription[tag].description,
          }))
      )
    )
  );

  const style = createElement(
    'style',
    `
      thead {
        border-bottom: 1px black solid;
        border-top: 2px black solid;
      }
      tbody {
        border-bottom: 2px black solid;
      }
      table {
        border-collapse: collapse;
      }
      td,
      th {
        padding: 2pt 8pt;
      }
    `
  );
  style.innerText = style.textContent;
  document.head.appendChild(style);

  const table = createElement('table', [
    createElement(
      'thead',
      createElement('tr', [
        createElement('th', 'Run'),
        createElement('th', 'Tag'),
        createElement('th', 'Greetings'),
        createElement('th', 'Description'),
      ])
    ),
    createElement(
      'tbody',
      data.flatMap(({run, tag, greetings, description}) =>
        greetings.map((guest, i) =>
          createElement('tr', [
            createElement('td', i === 0 ? run : null),
            createElement('td', i === 0 ? tag : null),
            createElement('td', guest),
            createElement('td', description),
          ])
        )
      )
    ),
  ]);
  msg.textContent = 'Data loaded.';
  document.body.appendChild(table);
}

function createElement(tag, children) {
  const result = document.createElement(tag);
  if (children != null) {
    if (typeof children === 'string') {
      result.textContent = children;
    } else if (Array.isArray(children)) {
      for (const child of children) {
        result.appendChild(child);
      }
    } else {
      result.appendChild(children);
    }
  }
  return result;
}
