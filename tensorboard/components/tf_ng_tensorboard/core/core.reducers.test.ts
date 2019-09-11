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

import * as actions from './core.actions';
import {reducers} from './core.reducers';
import {createPluginMetadata} from './test_util';

function createPluginsListing() {
  return {
    core: createPluginMetadata('Core'),
    scalars: createPluginMetadata('Scalars'),
  };
}

describe('core reducer', () => {
  describe('#changePlugin', () => {
    it('sets activePlugin to the one in action payload', () => {
      const state = {activePlugin: 'foo', plugins: {}};

      const nextState = reducers(state, actions.changePlugin({plugin: 'bar'}));

      expect(nextState).to.have.property('activePlugin', 'bar');
    });

    it('does not change plugins when activePlugin changes', () => {
      const state = {activePlugin: 'foo', plugins: createPluginsListing()};

      const nextState = reducers(state, actions.changePlugin({plugin: 'bar'}));

      expect(nextState).to.have.deep.property(
        'plugins',
        createPluginsListing()
      );
    });
  });

  describe('pluginsListingLoaded', () => {
    it('sets plugins with the payload', () => {
      const state = {activePlugin: 'foo', plugins: {}};
      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.deep.property(
        'plugins',
        createPluginsListing()
      );
    });

    it('sets activePlugin to the first plugin (by key order) when not defined', () => {
      const state = {activePlugin: null, plugins: {}};

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.property('activePlugin', 'core');
    });

    it('does not change activePlugin when already defined', () => {
      const state = {activePlugin: 'foo', plugins: {}};

      const nextState = reducers(
        state,
        actions.pluginsListingLoaded({plugins: createPluginsListing()})
      );

      expect(nextState).to.have.property('activePlugin', 'foo');
    });
  });
});
