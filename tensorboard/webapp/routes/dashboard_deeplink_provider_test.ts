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
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {skip} from 'rxjs/operators';
import {SerializableQueryParams} from '../app_routing/types';
import {State} from '../app_state';
import {PluginType} from '../metrics/data_source/types';
import {appStateFromMetricsState, buildMetricsState} from '../metrics/testing';
import {GroupBy, GroupByKey} from '../runs/types';
import * as selectors from '../selectors';
import {DashboardDeepLinkProvider} from './dashboard_deeplink_provider';
import {buildDeserializedState} from './testing';

describe('core deeplink provider', () => {
  let store: MockStore<State>;
  let provider: DashboardDeepLinkProvider;
  let queryParamsSerialized: SerializableQueryParams[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: {
            ...appStateFromMetricsState(buildMetricsState()),
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getPinnedCardsWithMetadata, []);
    store.overrideSelector(selectors.getUnresolvedImportedPinnedCards, []);
    store.overrideSelector(selectors.getEnabledExperimentalPlugins, []);
    store.overrideSelector(selectors.getOverriddenFeatureFlags, {});
    store.overrideSelector(selectors.getMetricsSettingOverrides, {});
    store.overrideSelector(selectors.getRunUserSetGroupBy, null);
    store.overrideSelector(selectors.getRunSelectorRegexFilter, '');

    queryParamsSerialized = [];

    provider = new DashboardDeepLinkProvider();
    provider
      .serializeStateToQueryParams(store)
      .pipe(
        // Skip the initial bootstrap.
        skip(1)
      )
      .subscribe((queryParams) => {
        queryParamsSerialized.push(queryParams);
      });
  });

  describe('time series', () => {
    describe('smoothing state', () => {
      it('serializes the smoothing state to the URL', () => {
        store.overrideSelector(selectors.getMetricsSettingOverrides, {
          scalarSmoothing: 0,
        });
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [
            {
              key: 'smoothing',
              value: '0',
            },
          ]
        );
      });

      it('does not reflect state when there is no override', () => {
        store.overrideSelector(selectors.getMetricsSettingOverrides, {});

        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          []
        );
      });

      it('deserializes the state in the URL without much sanitization', () => {
        const state1 = provider.deserializeQueryParams([
          {key: 'smoothing', value: '0.3'},
        ]);
        expect(state1.metrics.smoothing).toBe(0.3);

        const state2 = provider.deserializeQueryParams([
          {key: 'smoothing', value: '-0.3'},
        ]);
        expect(state2.metrics.smoothing).toBe(-0.3);
      });

      it('deserializes to null when smoothing is not provided', () => {
        const state = provider.deserializeQueryParams([]);
        expect(state.metrics.smoothing).toBe(null);
      });

      it('deserializes color group information', () => {
        function assert(value: string, expectedGroupBy: GroupBy | null) {
          const state = provider.deserializeQueryParams([
            {key: 'runColorGroup', value},
          ]);
          expect(state.runs.groupBy).toEqual(expectedGroupBy);
        }
        assert('experiment', {key: GroupByKey.EXPERIMENT});
        assert('run', {key: GroupByKey.RUN});
        assert('regex:', {key: GroupByKey.REGEX, regexString: ''});
        assert('regex:hello', {key: GroupByKey.REGEX, regexString: 'hello'});
        assert('', null);
        assert('regex', null);
        assert('runs', null);
        assert('experiments', null);
      });
    });

    describe('pinned state', () => {
      it('serializes pinned card state when store updates', () => {
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'accuracy',
            runId: null,
          },
        ]);
        store.overrideSelector(selectors.getUnresolvedImportedPinnedCards, [
          {
            plugin: PluginType.SCALARS,
            tag: 'loss',
          },
        ]);
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [
            {
              key: 'pinnedCards',
              value:
                '[{"plugin":"scalars","tag":"accuracy"},{"plugin":"scalars","tag":"loss"}]',
            },
          ]
        );

        store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'accuracy2',
            runId: null,
          },
        ]);
        store.overrideSelector(selectors.getUnresolvedImportedPinnedCards, [
          {
            plugin: PluginType.SCALARS,
            tag: 'loss2',
          },
        ]);
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [
            {
              key: 'pinnedCards',
              value:
                '[{"plugin":"scalars","tag":"accuracy2"},{"plugin":"scalars","tag":"loss2"}]',
            },
          ]
        );
      });

      it('serializes nothing when states are empty', () => {
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, []);
        store.overrideSelector(selectors.getUnresolvedImportedPinnedCards, []);
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          []
        );
      });

      it('deserializes empty pinned cards', () => {
        const state = provider.deserializeQueryParams([]);

        expect(state.metrics.pinnedCards).toEqual([]);
      });

      it('deserializes valid pinned cards', () => {
        const state = provider.deserializeQueryParams([
          {
            key: 'pinnedCards',
            value:
              '[{"plugin":"scalars","tag":"accuracy"},{"plugin":"images","tag":"loss","runId":"exp1/123","sample":5}]',
          },
        ]);

        const defaultState = buildDeserializedState();
        expect(state).toEqual({
          ...defaultState,
          metrics: {
            ...defaultState.metrics,
            pinnedCards: [
              {plugin: PluginType.SCALARS, tag: 'accuracy'},
              {
                plugin: PluginType.IMAGES,
                tag: 'loss',
                runId: 'exp1/123',
                sample: 5,
              },
            ],
          },
        });
      });

      it('sanitizes pinned cards on deserialization', () => {
        const cases = [
          {
            // malformed URL value
            serializedValue: 'blah[{"plugin":"scalars","tag":"accuracy"}]',
            expectedPinnedCards: [],
          },
          {
            // no plugin
            serializedValue:
              '[{"tag":"loss"},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // unknown plugin
            serializedValue:
              '[{"plugin":"unknown","tag":"loss"},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // tag is not a string
            serializedValue:
              '[{"plugin":"scalars","tag":5},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // tag is empty
            serializedValue:
              '[{"plugin":"scalars","tag":""},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // runId is not a string
            serializedValue:
              '[{"plugin":"images","tag":"loss","runId":123},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // runId is empty
            serializedValue:
              '[{"plugin":"images","tag":"loss","runId":""},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // runId provided with multi-run plugin
            serializedValue:
              '[{"plugin":"scalars","tag":"loss","runId":"123"},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // sample provided with non-sampled plugin
            serializedValue:
              '[{"plugin":"scalars","tag":"loss","sample":5},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // sample is not a number
            serializedValue:
              '[{"plugin":"images","tag":"loss","sample":"5"},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // sample is not an integer
            serializedValue:
              '[{"plugin":"images","tag":"loss","sample":5.5},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
          {
            // sample is negative
            serializedValue:
              '[{"plugin":"images","tag":"loss","sample":-5},{"plugin":"scalars","tag":"default"}]',
            expectedPinnedCards: [{plugin: PluginType.SCALARS, tag: 'default'}],
          },
        ];
        for (const {serializedValue, expectedPinnedCards} of cases) {
          const state = provider.deserializeQueryParams([
            {key: 'pinnedCards', value: serializedValue},
          ]);

          expect(state.metrics.pinnedCards).toEqual(expectedPinnedCards);
        }
      });
    });

    describe('tag filter', () => {
      it('serializes the filter text to the URL', () => {
        store.overrideSelector(selectors.getMetricsTagFilter, 'accuracy');
        store.refreshState();

        expect(queryParamsSerialized.slice(-1)[0]).toEqual([
          {key: 'tagFilter', value: 'accuracy'},
        ]);
      });

      it('does not serialize an empty string', () => {
        store.overrideSelector(selectors.getMetricsTagFilter, '');
        store.refreshState();

        expect(queryParamsSerialized).toEqual([]);
      });

      it('deserializes the string from the URL', () => {
        const state1 = provider.deserializeQueryParams([
          {key: 'tagFilter', value: 'accuracy'},
        ]);
        expect(state1.metrics.tagFilter).toBe('accuracy');
      });

      it('deserializes the empty string from the URL', () => {
        const state1 = provider.deserializeQueryParams([
          {key: 'tagFilter', value: ''},
        ]);
        expect(state1.metrics.tagFilter).toBe('');
      });

      it('deserializes to null when no value is provided', () => {
        const state = provider.deserializeQueryParams([]);
        expect(state.metrics.tagFilter).toBe(null);
      });
    });
  });

  describe('runs', () => {
    describe('color group', () => {
      it('does not put state in the URL when user set color group is null', () => {
        // Setting from `null` to `null` does not actually trigger the provider so
        // we have to set it: `null` -> something else -> `null` to test this
        // case.
        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.EXPERIMENT,
        });
        store.refreshState();

        store.overrideSelector(selectors.getRunUserSetGroupBy, null);
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          []
        );
      });

      it('serializes user set color group settings', () => {
        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.EXPERIMENT,
        });
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runColorGroup', value: 'experiment'}]
        );

        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.RUN,
        });
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runColorGroup', value: 'run'}]
        );

        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.REGEX,
          regexString: 'hello:world',
        });
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runColorGroup', value: 'regex:hello:world'}]
        );
      });

      it('serializes interesting regex strings', () => {
        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.REGEX,
          regexString: '',
        });
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runColorGroup', value: 'regex:'}]
        );

        store.overrideSelector(selectors.getRunUserSetGroupBy, {
          key: GroupByKey.REGEX,
          regexString: 'hello/(world):goodbye',
        });
        store.refreshState();
        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runColorGroup', value: 'regex:hello/(world):goodbye'}]
        );
      });
    });

    describe('filter', () => {
      it('does not serialize an empty string', () => {
        store.overrideSelector(selectors.getRunSelectorRegexFilter, '');
        store.refreshState();

        expect(queryParamsSerialized).toEqual([]);
      });

      it('serializes runFilter state', () => {
        store.overrideSelector(selectors.getRunSelectorRegexFilter, 'hello');
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runFilter', value: 'hello'}]
        );

        store.overrideSelector(selectors.getRunSelectorRegexFilter, 'hello:');
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runFilter', value: 'hello:'}]
        );

        store.overrideSelector(selectors.getRunSelectorRegexFilter, 'hello:.*');
        store.refreshState();

        expect(queryParamsSerialized[queryParamsSerialized.length - 1]).toEqual(
          [{key: 'runFilter', value: 'hello:.*'}]
        );
      });
    });
  });
});
