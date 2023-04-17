/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

const {readFileSync} = require('fs');

const PR_DESCRIPTION = process.argv[2];
const TEMPLATE = readFileSync('.github/PULL_REQUEST_TEMPLATE.md', 'utf8');

// Parse the section titles from the template file
const sectionHeaders = new Set(TEMPLATE
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean));

// Parse the sections from the pr description
const descriptionLines = PR_DESCRIPTION.split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const sections = {};
let currentSection;

for (let line of descriptionLines) {
  if (sectionHeaders.has(line)) {
    currentSection = line;
    sections[currentSection] = {
      title: line,
      content: [],
    };
    continue;
  }
  sections[currentSection]?.content.push(line);
}

console.log('Sections Found In Template', sectionHeaders);
console.log('Sections From Description', sections);

// Validate Sections
for (let header of sectionHeaders) {
  const section = sections[header];
  if (!section) {
    console.error(`Missing Section: "${header}"`);
    process.exit(1);
  }
  if(!section?.content.length) {
    console.error(`${header} cannot be empty`);
    process.exit(1);
  }
}

console.log('All sections appear valid');
