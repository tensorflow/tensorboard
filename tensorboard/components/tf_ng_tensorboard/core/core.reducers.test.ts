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
import {expect} from 'chai';
import * as sinon from 'sinon';

import * as actions from './core.actions';
import {reducers} from './core.reducers';
import {createPluginMetadata, createCoreState} from './testing';
import {LoadState} from '../types/api';

function createPluginsListing() {
  return {
    core: createPluginMetadata('Core'),
    scalars: createPluginMetadata('Scalars'),
  };
}

describe('core reducer', () => {
  describe('#changePlugin', () => {
    it('sets activePlugin to the one in action payload', () => {
      const state = createCoreState({activePlugin: 'foo', plugins: {}});

      const nextState = reducers(state, actions.changePlugin({plugin: 'bar'}));

      expect(nextState).to.have.property('activePlugin', 'bar');
    });

    it('does not change plugins when activePlugin changes', () => {
      const state = createCoreState({
        activePlugin: 'foo',
        plugins: createPluginsListing(),
      });

      const nextState = reducers(state, actions.changePlugin({plugin: 'bar'}));

      expect(nextState).to.have.deep.property(
        'plugins',
        createPluginsListing()
      );
    });
  });

  [
    {
      specSetName: '#pluginsListingRequested',
      action: actions.pluginsListingRequested(),
      expectedState: LoadState.LOADING,
    },
    {
      specSetName: '#pluginsListingFailed',
      action: actions.pluginsListingFailed(),
      expectedState: LoadState.FAILED,
    },
  ].forEach(({specSetName, action, expectedState}) => {
    describe(specSetName, () => {
      it('changes the pluginsListLoaded state to Loading', () => {
        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: null,
            state: LoadState.NOT_LOADED,
          },
        });
        const nextState = reducers(state, action);

        expect(nextState)
          .to.have.property('pluginsListLoaded')
          .to.have.property('state', expectedState);
      });

      it('keeps the lastLoadedTimeInMs the same', () => {
        const state = createCoreState({
          pluginsListLoaded: {
            lastLoadedTimeInMs: 1337,
            state: LoadState.NOT_LOADED,
          },
        });
        const nextState = reducers(state, action);

        expect(nextState)
          .to.have.property('pluginsListLoaded')
          .to.have.property('lastLoadedTimeInMs', 1337);
      });
    });
  });

  describe('#pluginsListingLoaded', () => {
    // type definition of sinon differs in google3 and it cannot be strongly
    // typed.
    // TODO(stephanwlee): prefer to use jasmine from now on.
    let clock: any;

    beforeEach(() => {
      clock = sinon.useFakeTimers(1000);
    });

    afterEach(() => {
      clock.restore();
    });

    it('sets plugins with the payload', () => {
      const state = createCoreState({activePlugin: 'foo', plugins: {}});
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.deep.property(
        'plugins',
        createPluginsListing()
      );
    });

    it('sets the pluginsListLoaded', () => {
      const state = createCoreState({
        activePlugin: 'foo',
        plugins: {},
        pluginsListLoaded: {
          state: LoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
      });
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.deep.property('pluginsListLoaded', {
        state: LoadState.LOADED,
        lastLoadedTimeInMs: 1000,
      });
    });

    it('sets activePlugin to the first plugin (by key order) when not defined', () => {
      const state = createCoreState({activePlugin: null, plugins: {}});

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.property('activePlugin', 'core');
    });

    it('does not change activePlugin when already defined', () => {
      const state = createCoreState({activePlugin: 'foo', plugins: {}});

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.property('activePlugin', 'foo');
    });
  });

  describe('#toggleReloadEnabled', () => {
    it('toggles reloadEnabled', () => {
      const state1 = createCoreState({reloadEnabled: false});

      const state2 = reducers(state1, actions.toggleReloadEnabled());

      expect(state2).to.have.property('reloadEnabled', true);

      const state3 = reducers(state2, actions.toggleReloadEnabled());

      expect(state3).to.have.property('reloadEnabled', false);
    });
  });

  describe('#changeReloadPeriod', () => {
    it('sets the reloadPeriodInMs', () => {
      const state = createCoreState({reloadPeriodInMs: 1});

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 1000})
      );

      expect(nextState).to.have.property('reloadPeriodInMs', 1000);
    });

    it('ignores the action when periodInMs is non-positive', () => {
      const baseState = createCoreState({reloadPeriodInMs: 1});

      const state1 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: 0})
      );
      expect(state1).to.have.property('reloadPeriodInMs', 1);

      const state2 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: -1000})
      );
      expect(state2).to.have.property('reloadPeriodInMs', 1);
    });
  });
});
