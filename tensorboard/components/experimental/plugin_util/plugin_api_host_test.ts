/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {of} from 'rxjs';
import {State} from '../../../webapp/app_state';
import {buildRun} from '../../../webapp/runs/store/testing';
import {
  getAppLastLoadedTimeInMs,
  getExperimentIdsFromRoute,
  getRuns,
} from '../../../webapp/selectors';
import {provideMockTbStore} from '../../../webapp/testing/utils';
import {PluginCoreApiHostImpl} from './core-host-impl';
import {MessageId} from './message_types';
import {Ipc} from './plugin-host-ipc';
import {PluginRunsApiHostImpl} from './runs-host-impl';
import {NoopIpc} from './testing';

describe('plugin_api_host test', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;
  let broadcastSpy: jasmine.Spy;
  let listenSpy: jasmine.Spy;
  let runApi: PluginRunsApiHostImpl;
  let coreApi: PluginCoreApiHostImpl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockTbStore(),
        {provide: Ipc, useClass: NoopIpc},
        PluginRunsApiHostImpl,
        PluginCoreApiHostImpl,
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getExperimentIdsFromRoute, ['e1']);
    store.overrideSelector(getRuns, []);
    store.overrideSelector(getAppLastLoadedTimeInMs, null);
    selectSpy = spyOn(store, 'select').and.callThrough();

    const ipc = TestBed.inject(Ipc);
    broadcastSpy = spyOn(ipc, 'broadcast');
    listenSpy = spyOn(ipc, 'listen');
    coreApi = TestBed.inject(PluginCoreApiHostImpl);
    runApi = TestBed.inject(PluginRunsApiHostImpl);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('runs apis', () => {
    describe('#experimental.RunsChanged', () => {
      it('broadcasts runs when runs change', () => {
        runApi.init();
        // initial `runs` are flushed.
        expect(broadcastSpy).toHaveBeenCalledTimes(1);
        expect(broadcastSpy).toHaveBeenCalledWith(MessageId.RUNS_CHANGED, []);

        store.overrideSelector(getRuns, [
          buildRun({
            id: '1',
            name: 'hello',
          }),
          buildRun({
            id: '2',
            name: 'world',
          }),
        ]);
        store.refreshState();

        expect(broadcastSpy).toHaveBeenCalledTimes(2);
        expect(broadcastSpy).toHaveBeenCalledWith(MessageId.RUNS_CHANGED, [
          'hello',
          'world',
        ]);
      });

      it('broadcasts runs combining all runs in current experiments', () => {
        store.overrideSelector(getExperimentIdsFromRoute, ['exp1', 'exp2']);
        const runsForExp = new Map([
          [
            'exp1',
            [
              buildRun({
                id: '1',
                name: 'hello',
              }),
              buildRun({
                id: '2',
                name: 'world',
              }),
            ],
          ],

          [
            'exp2',
            [
              buildRun({
                id: '3',
                name: 'hello',
              }),
              buildRun({
                id: '1',
                name: 'TensorBoard',
              }),
            ],
          ],
        ]);
        selectSpy
          .withArgs(getRuns, jasmine.any(Object))
          .and.callFake(
            (
              selector: typeof getRuns,
              {experimentId}: Parameters<typeof getRuns>[1]
            ) => {
              return of(runsForExp.get(experimentId));
            }
          );
        runApi.init();
        expect(broadcastSpy).toHaveBeenCalledWith(MessageId.RUNS_CHANGED, [
          'hello',
          'world',
          // different experiment id.
          'hello',
          'TensorBoard',
        ]);
      });

      it('broadcasts only when runs changes (run id)', () => {
        runApi.init();

        store.overrideSelector(getRuns, [
          buildRun({
            id: '1',
            name: 'hello',
          }),
          buildRun({
            id: '2',
            name: 'world',
          }),
        ]);
        store.refreshState();

        expect(broadcastSpy).toHaveBeenCalledTimes(2);

        store.overrideSelector(getRuns, [
          buildRun({
            id: '3',
            name: 'hello',
          }),
          buildRun({
            id: '2',
            name: 'world',
          }),
        ]);
        store.refreshState();
        expect(broadcastSpy).toHaveBeenCalledTimes(3);
      });
    });

    describe('#experimental.GetRuns', () => {
      let triggerGetRuns: () => Promise<string[]> = async () => [];

      beforeEach(() => {
        listenSpy
          .withArgs(MessageId.GET_RUNS, jasmine.any(Function))
          .and.callFake(
            (messageId: string, callback: typeof triggerGetRuns) => {
              triggerGetRuns = callback;
            }
          );
      });

      it('returns runs from the store', async () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: '1',
            name: 'hello',
          }),
          buildRun({
            id: '2',
            name: 'world',
          }),
        ]);
        store.refreshState();

        runApi.init();
        const actual = await triggerGetRuns();
        expect(actual).toEqual(['hello', 'world']);
      });

      it('returns the last runs from the store', async () => {
        runApi.init();
        store.overrideSelector(getRuns, [
          buildRun({
            id: '1',
            name: 'hello',
          }),
          buildRun({
            id: '2',
            name: 'world',
          }),
        ]);
        store.refreshState();

        store.overrideSelector(getRuns, [
          buildRun({
            id: '1',
            name: 'hello',
          }),
        ]);
        store.refreshState();

        const actual = await triggerGetRuns();
        expect(actual).toEqual(['hello']);
      });
    });
  });

  describe('core apis', () => {
    describe('#experiment.GetURLPluginData', () => {
      let triggerGetUrlData: (context: {
        pluginName: string;
      }) => Record<string, string> = () => ({});

      beforeEach(() => {
        listenSpy
          .withArgs(MessageId.GET_URL_DATA, jasmine.any(Function))
          .and.callFake(
            (messageId: string, callback: typeof triggerGetUrlData) => {
              triggerGetUrlData = callback;
            }
          );
      });

      it('returns url data from the tf storage', () => {
        // Do not rely on Polymer bundle in the test.
        window.tensorboard = {
          tf_globals: {},
          tf_storage: {
            getUrlHashDict: () => {
              return {
                globalThing: 'hey',
                'p.plugin_id.a': '1',
                'p.plugin_id.b': 'b',
                'p.another_plugn.b': '2',
              };
            },
          },
        } as any;
        coreApi.init();
        const actual = triggerGetUrlData({pluginName: 'plugin_id'});
        expect(actual).toEqual({
          a: '1',
          b: 'b',
        });
      });
    });

    describe('#experimental.DataReloaded', () => {
      it('calls callback when last updated time changes', () => {
        coreApi.init();

        store.overrideSelector(getAppLastLoadedTimeInMs, null);
        store.refreshState();
        expect(broadcastSpy).toHaveBeenCalledTimes(0);

        store.overrideSelector(getAppLastLoadedTimeInMs, 1);
        store.refreshState();
        expect(broadcastSpy).toHaveBeenCalledTimes(1);

        store.overrideSelector(getAppLastLoadedTimeInMs, 1);
        store.refreshState();
        expect(broadcastSpy).toHaveBeenCalledTimes(1);

        store.overrideSelector(getAppLastLoadedTimeInMs, 2);
        store.refreshState();
        expect(broadcastSpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
