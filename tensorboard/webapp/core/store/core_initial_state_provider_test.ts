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
import {DeepLinkerInterface, SetStringOption} from '../../deeplink/types';
import {getConfig} from './core_initial_state_provider';
import {CoreState} from './core_types';

class TestableDeepLinker implements DeepLinkerInterface {
  getString(key: string): string {
    throw new Error('Method not implemented.');
  }
  setString(
    key: string,
    value: string,
    options?: SetStringOption | undefined
  ): void {
    throw new Error('Method not implemented.');
  }
  getPluginId(): string {
    throw new Error('Method not implemented.');
  }
  setPluginId(pluginId: string, options?: SetStringOption | undefined): void {
    throw new Error('Method not implemented.');
  }
}

describe('core_initial_state_provider', () => {
  describe('#getConfig', () => {
    let deeplinker: TestableDeepLinker;
    let getPluginIdSpy: jasmine.Spy;

    beforeEach(() => {
      deeplinker = new TestableDeepLinker();
      getPluginIdSpy = spyOn(deeplinker, 'getPluginId').and.returnValue('foo');
    });

    it('returns initialState', () => {
      const config = getConfig(deeplinker);

      expect(config.initialState).toBeDefined();
    });

    it('returns type of CoreState', () => {
      const config = getConfig(deeplinker);
      const state = config.initialState as CoreState;

      expect(state.activePlugin).toBeDefined();
      expect(state.plugins).toBeDefined();
      expect(state.pluginsListLoaded).toBeDefined();
    });

    it('sets activePlugin from the deeplinker', () => {
      getPluginIdSpy.and.returnValue('bar');
      const config = getConfig(deeplinker);

      expect((config.initialState as CoreState).activePlugin).toBe('bar');
    });

    it('sets null if deeplinker does not have activePluginId', () => {
      getPluginIdSpy.and.returnValue('');
      const config = getConfig(deeplinker);

      expect((config.initialState as CoreState).activePlugin).toBeNull();
    });
  });
});
