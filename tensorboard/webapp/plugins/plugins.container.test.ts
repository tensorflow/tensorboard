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
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {PluginsComponent} from './plugins.component';

import {PluginId, LoadingMechanismType, LoadState} from '../types/api';
import {State, CoreState, CORE_FEATURE_KEY} from '../core/core.reducers';
import {createState, createCoreState} from '../core/testing';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('plugins.component', () => {
  let store: MockStore<State>;
  const INITIAL_CORE_STATE: Partial<CoreState> = {
    plugins: {
      bar: {
        disable_reload: false,
        enabled: true,
        loading_mechanism: {
          type: LoadingMechanismType.CUSTOM_ELEMENT,
          element_name: 'tb-bar',
        },
        tab_name: 'Bar',
        remove_dom: false,
      },
      foo: {
        disable_reload: false,
        enabled: true,
        loading_mechanism: {
          type: LoadingMechanismType.IFRAME,
          // This will cause 404 as test bundles do not serve
          // data file in the karma server.
          module_path: 'random_esmodule.js',
        },
        tab_name: 'Bar',
        remove_dom: false,
      },
    },
  };

  beforeEach(async () => {
    const initialState = createState(
      createCoreState({
        ...INITIAL_CORE_STATE,
      })
    );
    await TestBed.configureTestingModule({
      providers: [provideMockStore({initialState}), PluginsComponent],
      declarations: [PluginsComponent],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  describe('plugin DOM creation', () => {
    function setActivePlugin(plugin: PluginId) {
      store.setState(
        createState(
          createCoreState({
            ...INITIAL_CORE_STATE,
            activePlugin: plugin,
          })
        )
      );
    }

    it('creates no plugin when there is no activePlugin', () => {
      const fixture = TestBed.createComponent(PluginsComponent);
      const el = fixture.debugElement.query(By.css('.plugins'));
      expect(el.nativeElement.childElementCount).toBe(0);
    });

    it('creates an element for CUSTOM_ELEMENT type of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsComponent);
      fixture.detectChanges();

      setActivePlugin('bar');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const pluginElement = nativeElement.children[0];
      expect(pluginElement.tagName).toBe('TB-BAR');
      expect(pluginElement.id).toBe('bar');
    });

    it('creates an element for IFRAME type of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsComponent);
      fixture.detectChanges();

      setActivePlugin('foo');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const pluginElement = nativeElement.children[0];
      expect(pluginElement.tagName).toBe('IFRAME');
      expect(pluginElement.id).toBe('foo');
      expect(pluginElement.contentDocument.body.innerHTML).toContain(
        'random_esmodule.js'
      );
    });

    it('keeps instance of plugin after being inactive but hides it', async () => {
      const fixture = TestBed.createComponent(PluginsComponent);
      fixture.detectChanges();

      setActivePlugin('foo');

      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        fixture.debugElement.query(By.css('.plugins')).nativeElement
          .childElementCount
      ).toBe(1);

      setActivePlugin('bar');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(2);
      const [fooElement, barElement] = nativeElement.children;
      expect(fooElement.id).toBe('foo');
      expect(fooElement.style.display).toBe('none');
      expect(barElement.id).toBe('bar');
      expect(barElement.style.display).not.toBe('none');
    });

    it('does not create same instance of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsComponent);
      fixture.detectChanges();

      setActivePlugin('foo');

      fixture.detectChanges();
      await fixture.whenStable();

      setActivePlugin('bar');

      fixture.detectChanges();
      await fixture.whenStable();

      setActivePlugin('foo');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(2);
      const [fooElement, barElement] = nativeElement.children;
      expect(fooElement.id).toBe('foo');
      expect(fooElement.style.display).not.toBe('none');
    });
  });

  describe('updates', () => {
    function setLastLoadedTime(
      timeInMs: number | null,
      state = LoadState.LOADED
    ) {
      store.setState(
        createState(
          createCoreState({
            ...INITIAL_CORE_STATE,
            activePlugin: 'bar',
            pluginsListLoaded: {
              state,
              lastLoadedTimeInMs: timeInMs,
            },
          })
        )
      );
    }

    it('invokes reload method on the dashboard DOM', () => {
      const fixture = TestBed.createComponent(PluginsComponent);

      setLastLoadedTime(null, LoadState.NOT_LOADED);
      fixture.detectChanges();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      const [barElement] = nativeElement.children;
      const reloadSpy = jasmine.createSpy();
      barElement.reload = reloadSpy;

      setLastLoadedTime(1);
      fixture.detectChanges();
      expect(reloadSpy).toHaveBeenCalledTimes(1);

      setLastLoadedTime(1);
      fixture.detectChanges();
      expect(reloadSpy).toHaveBeenCalledTimes(1);

      setLastLoadedTime(2);
      fixture.detectChanges();
      expect(reloadSpy).toHaveBeenCalledTimes(2);
    });
  });
});
