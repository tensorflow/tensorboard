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
import {stateRehydratedFromUrl} from '../../app_routing/actions/app_routing_actions';
import {RouteKind} from '../../app_routing/types';
import {persistentSettingsLoaded} from '../../persistent_settings';
import {DataLoadState} from '../../types/data';
import * as actions from '../actions';
import {runsTableFullScreenToggled} from '../actions';
import {
  buildPluginMetadata,
  createCoreState,
  createEnvironment,
  createPluginMetadata,
} from '../testing';
import {PluginsListFailureCode} from '../types';
import {reducers} from './core_reducers';

function createPluginsListing() {
  return {
    core: createPluginMetadata('Core'),
    scalars: createPluginMetadata('Scalars'),
  };
}

describe('core reducer', () => {
  [
    {
      action: actions.changePlugin({plugin: 'bar'}),
    },
    {
      action: actions.pluginUrlHashChanged({plugin: 'bar'}),
    },
  ].forEach(({action}) => {
    describe(action.type, () => {
      it('sets activePlugin to the one in action payload', () => {
        const state = createCoreState({activePlugin: 'foo', plugins: {}});

        const nextState = reducers(state, action);

        expect(nextState.activePlugin).toBe('bar');
      });

      it('does not change plugins when activePlugin changes', () => {
        const state = createCoreState({
          activePlugin: 'foo',
          plugins: createPluginsListing(),
        });

        const nextState = reducers(state, action);

        expect(nextState.plugins).toEqual(createPluginsListing());
      });
    });
  });

  describe('#pluginsListingRequested', () => {
    it('changes the pluginsListLoaded state to LOADING', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.NOT_LOADED,
          failureCode: null,
        },
      });
      const nextState = reducers(state, actions.pluginsListingRequested());

      expect(nextState.pluginsListLoaded.state).toEqual(DataLoadState.LOADING);
    });

    it('keeps the lastLoadedTimeInMs the same', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: 1337,
          state: DataLoadState.NOT_LOADED,
          failureCode: null,
        },
      });
      const nextState = reducers(state, actions.pluginsListingRequested());

      expect(nextState.pluginsListLoaded.lastLoadedTimeInMs).toBe(1337);
    });

    it('keeps the failureCode', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.FAILED,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        },
      });
      const nextState = reducers(state, actions.pluginsListingRequested());

      expect(nextState.pluginsListLoaded.failureCode).toEqual(
        PluginsListFailureCode.NOT_FOUND
      );
    });

    it('sets the coreDataLoadState as loading', () => {
      const state = createCoreState({
        coreDataLoadState: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
      });
      const nextState = reducers(state, actions.pluginsListingRequested());

      expect(nextState.coreDataLoadState).toEqual({
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
    });
  });

  describe('#pluginsListingFailed', () => {
    it('changes the pluginsListLoaded state to FAILED', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADING,
          failureCode: null,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingFailed({
          failureCode: PluginsListFailureCode.UNKNOWN,
        })
      );

      expect(nextState.pluginsListLoaded.state).toEqual(DataLoadState.FAILED);
    });

    it('keeps the lastLoadedTimeInMs the same', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: 1337,
          state: DataLoadState.LOADING,
          failureCode: null,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingFailed({
          failureCode: PluginsListFailureCode.UNKNOWN,
        })
      );

      expect(nextState.pluginsListLoaded.lastLoadedTimeInMs).toBe(1337);
    });

    it('sets the failureCode', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADING,
          failureCode: null,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingFailed({
          failureCode: PluginsListFailureCode.NOT_FOUND,
        })
      );

      expect(nextState.pluginsListLoaded.failureCode).toEqual(
        PluginsListFailureCode.NOT_FOUND
      );
    });

    it('sets the coreDataLoadState as failed', () => {
      const state = createCoreState({
        coreDataLoadState: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 3,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingFailed({
          failureCode: PluginsListFailureCode.NOT_FOUND,
        })
      );

      expect(nextState.coreDataLoadState).toEqual({
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: 3,
      });
    });
  });

  describe('#pluginsListingLoaded', () => {
    beforeEach(() => {
      // Angular's zonejs installs mock clock by default. No need for another.
      jasmine.clock().mockDate(new Date(1000));
    });

    it('sets plugins with the payload', () => {
      const state = createCoreState({activePlugin: 'foo', plugins: {}});
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState.plugins).toEqual(createPluginsListing());
    });

    it('sets the pluginsListLoaded', () => {
      const state = createCoreState({
        activePlugin: 'foo',
        plugins: {},
        pluginsListLoaded: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
          failureCode: null,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState.pluginsListLoaded).toEqual({
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1000,
        failureCode: null,
      });
    });

    it('sets activePlugin to the first enabled plugin when not defined', () => {
      const state = createCoreState({activePlugin: null, plugins: {}});

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({
          plugins: {
            foo: buildPluginMetadata({tab_name: 'foo', enabled: false}),
            bar: buildPluginMetadata({tab_name: 'bar', enabled: true}),
          },
        })
      );

      expect(nextState.activePlugin).toBe('bar');
    });

    it('sets the plugin to null when nothing is active', () => {
      const state = createCoreState({activePlugin: null, plugins: {}});

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({
          plugins: {
            foo: buildPluginMetadata({tab_name: 'foo', enabled: false}),
            bar: buildPluginMetadata({tab_name: 'bar', enabled: false}),
          },
        })
      );

      expect(nextState.activePlugin).toBeNull();
    });

    it('does not change activePlugin when already defined', () => {
      const state = createCoreState({activePlugin: 'foo', plugins: {}});

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState.activePlugin).toBe('foo');
    });

    it('clears the failureCode', () => {
      const state = createCoreState({
        pluginsListLoaded: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADING,
          failureCode: PluginsListFailureCode.UNKNOWN,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState.pluginsListLoaded.failureCode).toBeNull();
    });

    describe('coreLoadedState', () => {
      it('sets state to LOADED when polymerRuns are loaded', () => {
        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.LOADING,
            failureCode: PluginsListFailureCode.UNKNOWN,
          },
          coreDataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 3,
          },
          polymerRunsLoadState: {
            lastLoadedTimeInMs: 5,
            state: DataLoadState.LOADED,
          },
        });
        const nextState = reducers(
          state,
          actions.pluginsListingLoaded({plugins: createPluginsListing()})
        );

        expect(nextState.coreDataLoadState).toEqual({
          lastLoadedTimeInMs: 1000,
          state: DataLoadState.LOADED,
        });
      });

      it('noops when polymerRuns are not loaded', () => {
        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.LOADING,
            failureCode: PluginsListFailureCode.UNKNOWN,
          },
          coreDataLoadState: {
            state: DataLoadState.FAILED,
            lastLoadedTimeInMs: null,
          },
          polymerRunsLoadState: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.FAILED,
          },
        });
        const nextState = reducers(
          state,
          actions.pluginsListingLoaded({plugins: createPluginsListing()})
        );

        expect(nextState.coreDataLoadState).toEqual({
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
        });
      });
    });
  });

  describe('#environmentLoaded', () => {
    it('sets environment with the payload', () => {
      const state = createCoreState({
        environment: createEnvironment({data_location: '/original/location'}),
      });
      const nextState = reducers(
        state,
        actions.environmentLoaded({
          environment: createEnvironment({data_location: '/new/location'}),
        })
      );

      expect(nextState.environment.data_location).toEqual('/new/location');
    });
  });

  describe('#fetchRunSucceeded', () => {
    it('sets polymerInteropRuns', () => {
      const state = createCoreState({polymerInteropRuns: []});

      const nextState = reducers(
        state,
        actions.fetchRunSucceeded({
          runs: [
            {id: '1', name: 'Run name 1'},
            {id: '2', name: 'Run name 2'},
          ],
        })
      );

      expect(nextState.polymerInteropRuns).toEqual([
        {id: '1', name: 'Run name 1'},
        {id: '2', name: 'Run name 2'},
      ]);
    });
  });

  describe('#polymerInteropRunSelectionChanged', () => {
    it('changes the polymerInteropRunSelection', () => {
      const state = createCoreState({
        polymerInteropRuns: [
          {id: '1', name: 'Run name 1'},
          {id: '2', name: 'Run name 2'},
          {id: '3', name: 'Run name 3'},
          {id: '4', name: 'Run name 4'},
        ],
        polymerInteropRunSelection: new Set(),
      });

      const nextState = reducers(
        state,
        actions.polymerInteropRunSelectionChanged({
          nextSelection: ['1', '2', '4'],
        })
      );

      expect(nextState.polymerInteropRunSelection).toEqual(
        new Set(['1', '2', '4'])
      );
    });
  });

  describe('#polymerRunsFetchRequested', () => {
    it('sets polymerRunsLoadState to LOADING', () => {
      const state = createCoreState({
        polymerRunsLoadState: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1,
        },
      });

      const nextState = reducers(state, actions.polymerRunsFetchRequested());

      expect(nextState.polymerRunsLoadState).toEqual({
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: 1,
      });
    });

    it('sets coreLoadedState to LOADING', () => {
      const state = createCoreState({
        coreDataLoadState: {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: 3,
        },
        polymerRunsLoadState: {
          lastLoadedTimeInMs: 3,
          state: DataLoadState.NOT_LOADED,
        },
      });
      const nextState = reducers(state, actions.polymerRunsFetchRequested());

      expect(nextState.coreDataLoadState).toEqual({
        lastLoadedTimeInMs: 3,
        state: DataLoadState.LOADING,
      });
    });
  });

  describe('#polymerRunsFetchSucceeded', () => {
    it('sets polymerRunsLoadState to LOADED', () => {
      spyOn(Date, 'now').and.returnValue(5);
      const state = createCoreState({
        polymerRunsLoadState: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 1,
        },
      });

      const nextState = reducers(state, actions.polymerRunsFetchSucceeded());

      expect(nextState.polymerRunsLoadState).toEqual({
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 5,
      });
    });

    describe('coreLoadedState', () => {
      it('sets state to LOADED when pluginsListing is loaded', () => {
        spyOn(Date, 'now').and.returnValue(10);

        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: 3,
            state: DataLoadState.LOADED,
            failureCode: null,
          },
          coreDataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 3,
          },
          polymerRunsLoadState: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.LOADING,
          },
        });
        const nextState = reducers(state, actions.polymerRunsFetchSucceeded());

        expect(nextState.coreDataLoadState).toEqual({
          lastLoadedTimeInMs: 10,
          state: DataLoadState.LOADED,
        });
      });

      it('noops when pluginsListing is not loaded', () => {
        spyOn(Date, 'now').and.returnValue(10);
        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.LOADING,
            failureCode: null,
          },
          coreDataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
          polymerRunsLoadState: {
            lastLoadedTimeInMs: null,
            state: DataLoadState.LOADING,
          },
        });
        const nextState = reducers(state, actions.polymerRunsFetchSucceeded());

        expect(nextState.coreDataLoadState).toEqual({
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        });
      });
    });
  });

  describe('#polymerRunsFetchFailed', () => {
    it('sets polymerRunsLoadState to FAILED', () => {
      const state = createCoreState({
        polymerRunsLoadState: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 1,
        },
      });

      const nextState = reducers(state, actions.polymerRunsFetchFailed());

      expect(nextState.polymerRunsLoadState).toEqual({
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: 1,
      });
    });

    it('sets coreLoadedState to FAILED', () => {
      const state = createCoreState({
        coreDataLoadState: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 3,
        },
        polymerRunsLoadState: {
          lastLoadedTimeInMs: null,
          state: DataLoadState.LOADING,
        },
      });
      const nextState = reducers(state, actions.polymerRunsFetchFailed());

      expect(nextState.coreDataLoadState).toEqual({
        lastLoadedTimeInMs: 3,
        state: DataLoadState.FAILED,
      });
    });
  });

  describe('#sideBarWidthChanged', () => {
    it('sets sideBarWidthInPercent', () => {
      const state = createCoreState({
        sideBarWidthInPercent: 0,
      });
      const nextState = reducers(
        state,
        actions.sideBarWidthChanged({widthInPercent: 30})
      );

      expect(nextState.sideBarWidthInPercent).toBe(30);
    });

    it('clips the value so it is between 0 and 100, inclusive', () => {
      const state1 = createCoreState({
        sideBarWidthInPercent: 5,
      });
      const state2 = reducers(
        state1,
        actions.sideBarWidthChanged({widthInPercent: -10})
      );
      expect(state2.sideBarWidthInPercent).toBe(0);

      const state3 = reducers(
        state2,
        actions.sideBarWidthChanged({widthInPercent: 100})
      );
      expect(state3.sideBarWidthInPercent).toBe(100);
    });
  });

  describe('#persistentSettingsLoaded', () => {
    it('loads sideBarWidthInPercent from settings when present', () => {
      const state = createCoreState({
        sideBarWidthInPercent: 0,
      });
      const nextState = reducers(
        state,
        persistentSettingsLoaded({partialSettings: {sideBarWidthInPercent: 40}})
      );

      expect(nextState.sideBarWidthInPercent).toBe(40);
    });

    it('ignores partial settings without the sidebar width', () => {
      const state = createCoreState({
        sideBarWidthInPercent: 0,
      });
      const nextState = reducers(
        state,
        persistentSettingsLoaded({partialSettings: {}})
      );

      expect(nextState.sideBarWidthInPercent).toBe(0);
    });

    it('loads when value is in between 0-100, inclusive', () => {
      const state1 = createCoreState({
        sideBarWidthInPercent: 0,
      });
      const state2 = reducers(
        state1,
        persistentSettingsLoaded({
          partialSettings: {sideBarWidthInPercent: 101},
        })
      );
      expect(state2.sideBarWidthInPercent).toBe(0);

      const state3 = reducers(
        state2,
        persistentSettingsLoaded({partialSettings: {sideBarWidthInPercent: -1}})
      );
      expect(state3.sideBarWidthInPercent).toBe(0);

      const state4 = reducers(
        state3,
        persistentSettingsLoaded({
          partialSettings: {sideBarWidthInPercent: NaN},
        })
      );
      expect(state4.sideBarWidthInPercent).toBe(0);
    });
  });

  describe('#runsTableFullScreenToggled', () => {
    it('toggles runsTableFullScreen attribute', () => {
      const state = createCoreState({
        runsTableFullScreen: false,
      });
      const state2 = reducers(state, runsTableFullScreenToggled());
      const state3 = reducers(state2, runsTableFullScreenToggled());

      expect(state2.runsTableFullScreen).toBeTrue();
      expect(state3.runsTableFullScreen).toBeFalse();
    });
  });

  describe('#stateRehydratedFromUrl', () => {
    it('stores unknownQueryParams', () => {
      const state = createCoreState();
      const state2 = reducers(
        state,
        stateRehydratedFromUrl({
          routeKind: RouteKind.EXPERIMENT,
          partialState: {unknownQueryParams: {foo: 'bar'}},
        })
      );
      expect(state2.unknownQueryParams).toEqual({
        foo: 'bar',
      });
    });

    it('stores an empty object when no value is provided', () => {
      const state = createCoreState({
        unknownQueryParams: {foo: 'bar'},
      });
      const state2 = reducers(
        state,
        stateRehydratedFromUrl({
          routeKind: RouteKind.EXPERIMENT,
          partialState: {},
        })
      );
      expect(state2.unknownQueryParams).toEqual({});
    });
  });
});
