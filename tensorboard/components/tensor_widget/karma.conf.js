/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

const karmaTypescriptConfig = {
  tsconfig: 'tsconfig.json',
  // Disable coverage reports and instrumentation by default for tests
  coverageOptions: {instrumentation: false},
  reports: {}
};

// Enable coverage reports and instrumentation under KARMA_COVERAGE=1 env
const coverageEnabled = !!process.env.KARMA_COVERAGE;
if (coverageEnabled) {
  karmaTypescriptConfig.coverageOptions.instrumentation = true;
  karmaTypescriptConfig.coverageOptions.exclude = /_test\.ts$/;
  karmaTypescriptConfig.reports = {html: 'coverage', 'text-summary': ''};
}

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    files: [{pattern: './*.ts'}],
    preprocessors: {
      './*.ts': ['karma-typescript'],
    },
    karmaTypescriptConfig,
    reporters: ['progress', 'karma-typescript'],
    browsers: ['Chrome'],
    reportSlowerThan: 500,
    browserNoActivityTimeout: 30000,
    client: {
      jasmine: {
        random: false
      },
      args: ['--grep', config.grep || '']
    }
  });
};
