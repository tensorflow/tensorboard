/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {serializeExperimentIds} from './utils';

describe('run store utils test', () => {
  describe('#serializeExperimentIds', () => {
    it('serializes experiment ids into a string', () => {
      const actual = serializeExperimentIds(['b', 'c', 'd']);

      expect(actual).toBe('["b","c","d"]');
    });

    it('sorts the experiment ids so order does not matter', () => {
      const a = serializeExperimentIds(['a', 'c', 'b']);
      const b = serializeExperimentIds(['b', 'a', 'c']);

      expect(a).toBe(b);
    });
  });
});
