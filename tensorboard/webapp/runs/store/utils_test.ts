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
import {GroupByKey} from '../types';
import {buildRun} from './testing';
import {groupRuns, serializeExperimentIds} from './utils';

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

  describe('#groupRuns', () => {
    describe('by runs', () => {
      it('groups runs by run ids', () => {
        const actual = groupRuns(
          {key: GroupByKey.RUN},
          [
            buildRun({id: 'eid1/alpha', name: 'alpha'}),
            buildRun({id: 'eid1/beta', name: 'beta'}),
            buildRun({id: 'eid2/beta', name: 'beta'}),
            buildRun({id: 'eid2/gamma', name: 'gamma'}),
          ],
          {
            'eid1/alpha': 'eid1',
            'eid1/beta': 'eid1',
            'eid2/beta': 'eid2',
            'eid2/gamma': 'eid2',
          }
        );

        expect(actual).toEqual({
          'eid1/alpha': [buildRun({id: 'eid1/alpha', name: 'alpha'})],
          'eid1/beta': [buildRun({id: 'eid1/beta', name: 'beta'})],
          'eid2/beta': [buildRun({id: 'eid2/beta', name: 'beta'})],
          'eid2/gamma': [buildRun({id: 'eid2/gamma', name: 'gamma'})],
        });
      });
    });

    describe('by experiment', () => {
      it('groups runs by experiment ids', () => {
        const actual = groupRuns(
          {key: GroupByKey.EXPERIMENT},
          [
            buildRun({id: 'eid1/alpha', name: 'alpha'}),
            buildRun({id: 'eid1/beta', name: 'beta'}),
            buildRun({id: 'eid2/beta', name: 'beta'}),
            buildRun({id: 'eid2/gamma', name: 'gamma'}),
          ],
          {
            'eid1/alpha': 'eid1',
            'eid1/beta': 'eid1',
            'eid2/beta': 'eid2',
            'eid2/gamma': 'eid2',
          }
        );

        expect(actual).toEqual({
          eid1: [
            buildRun({id: 'eid1/alpha', name: 'alpha'}),
            buildRun({id: 'eid1/beta', name: 'beta'}),
          ],
          eid2: [
            buildRun({id: 'eid2/beta', name: 'beta'}),
            buildRun({id: 'eid2/gamma', name: 'gamma'}),
          ],
        });
      });
    });

    describe('by regex', () => {
      it('throws error when the regex is empty', () => {
        let errorMessage = '';
        try {
          groupRuns(
            {key: GroupByKey.REGEX, regexString: ''},
            [
              buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
              buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
              buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
              buildRun({id: 'eid2/gamma', name: 'gamma'}),
            ],
            {
              'eid1/alpha': 'eid1',
              'eid1/beta': 'eid1',
              'eid2/beta': 'eid2',
              'eid2/gamma': 'eid2',
            }
          );
        } catch (error) {
          errorMessage = error.message;
        }
        expect(errorMessage).toBe('Empty regex string.');
      });

      it('throws error when the regex is invalid', () => {
        let errorMessage = '';
        try {
          groupRuns(
            {key: GroupByKey.REGEX, regexString: 'foo\\d+)bar'},
            [
              buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
              buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
              buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
              buildRun({id: 'eid2/gamma', name: 'gamma'}),
            ],
            {
              'eid1/alpha': 'eid1',
              'eid1/beta': 'eid1',
              'eid2/beta': 'eid2',
              'eid2/gamma': 'eid2',
            }
          );
        } catch (error) {
          errorMessage = error.message;
        }
        expect(errorMessage).toBe('Invalid regex.');
      });

      it('groups runs by regex without capture group', () => {
        const actual = groupRuns(
          {key: GroupByKey.REGEX, regexString: 'foo\\d+bar'},
          [
            buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
            buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
            buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
            buildRun({id: 'eid2/gamma', name: 'gamma'}),
          ],
          {
            'eid1/alpha': 'eid1',
            'eid1/beta': 'eid1',
            'eid2/beta': 'eid2',
            'eid2/gamma': 'eid2',
          }
        );

        expect(actual).toEqual({
          matches: [
            buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
            buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
            buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
          ],
          'eid2/gamma': [buildRun({id: 'eid2/gamma', name: 'gamma'})],
        });
      });

      it('groups runs by regex with one capture group', () => {
        const actual = groupRuns(
          {key: GroupByKey.REGEX, regexString: 'foo(\\d+)bar'},
          [
            buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
            buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
            buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
            buildRun({id: 'eid2/gamma', name: 'foo2bar3'}),
          ],
          {
            'eid1/alpha': 'eid1',
            'eid1/beta': 'eid1',
            'eid2/beta': 'eid2',
            'eid2/gamma': 'eid2',
          }
        );

        expect(actual).toEqual({
          '1': [
            buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
            buildRun({id: 'eid1/beta', name: 'foo1bar2'}),
          ],
          '2': [
            buildRun({id: 'eid2/beta', name: 'foo2bar1'}),
            buildRun({id: 'eid2/gamma', name: 'foo2bar3'}),
          ],
        });
      });

      it('groups runs by regex with multiple capture group', () => {
        const actual = groupRuns(
          {key: GroupByKey.REGEX, regexString: 'foo(\\d+)bar(\\d+)'},
          [
            buildRun({id: 'eid1/alpha', name: 'foo1bar1'}),
            buildRun({id: 'eid1/beta', name: 'foo2bar1'}),
            buildRun({id: 'eid2/beta', name: 'foo2bar2'}),
            buildRun({id: 'eid2/gamma', name: 'foo2bar2bar'}),
          ],
          {
            'eid1/alpha': 'eid1',
            'eid1/beta': 'eid1',
            'eid2/beta': 'eid2',
            'eid2/gamma': 'eid2',
          }
        );

        expect(actual).toEqual({
          '1_1': [buildRun({id: 'eid1/alpha', name: 'foo1bar1'})],
          '2_1': [buildRun({id: 'eid1/beta', name: 'foo2bar1'})],
          '2_2': [
            buildRun({id: 'eid2/beta', name: 'foo2bar2'}),
            buildRun({id: 'eid2/gamma', name: 'foo2bar2bar'}),
          ],
        });
      });
    });
  });
});
