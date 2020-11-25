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
import {buildRun} from '../../../runs/store/testing';

import {getDisplayNameForRun} from './utils';

describe('metrics card_renderer utils test', () => {
  describe('#getDisplayNameForRun', () => {
    it('returns runId when Run and experimentId are not present', () => {
      expect(getDisplayNameForRun('rid', null, null)).toBe('rid');
    });

    it('returns only run name when only experiment name is not present', () => {
      expect(getDisplayNameForRun('rid', buildRun({name: 'foo'}), null)).toBe(
        'foo'
      );
    });

    it('returns "..." for run name, when only run is not present', () => {
      expect(getDisplayNameForRun('rid', null, 'eid')).toBe('eid/...');
    });

    it('returns exp and run name delimited by "/" when both are present', () => {
      expect(
        getDisplayNameForRun('rid', buildRun({name: 'foo/bar'}), 'eid')
      ).toBe('eid/foo/bar');
    });
  });
});
