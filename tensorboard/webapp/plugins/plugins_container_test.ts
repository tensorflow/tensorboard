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
import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {
  getTestingProvider,
  PluginApiHostModule,
} from '../../components/experimental/plugin_util/testing';
import {TestingDebuggerModule} from '../../plugins/debugger_v2/tf_debugger_v2_plugin/testing';
import {State} from '../core/store';
import {
  getActivePlugin,
  getAppLastLoadedTimeInMs,
  getEnvironment,
  getPlugins,
  getPluginsListLoaded,
} from '../core/store/core_selectors';
import {PluginsListFailureCode} from '../core/types';
import {
  getFeatureFlags,
  getIsFeatureFlagsLoaded,
} from '../feature_flag/store/feature_flag_selectors';
import {buildFeatureFlag} from '../feature_flag/testing';
import {selectors as settingsSelectors} from '../settings';
import {provideMockTbStore} from '../testing/utils';
import {
  CustomElementLoadingMechanism,
  IframeLoadingMechanism,
  LoadingMechanismType,
  NgElementLoadingMechanism,
  NoLoadingMechanism,
  PluginId,
} from '../types/api';
import {DataLoadState} from '../types/data';
import {PluginsComponent} from './plugins_component';
import {PluginsContainer} from './plugins_container';
import {PluginRegistryModule} from './plugin_registry_module';
import {ExtraDashboardModule} from './testing';

function expectPluginIframe(element: HTMLElement, name: string) {
  expect(element.tagName).toBe('IFRAME');
  expect((element as HTMLIFrameElement).src).toContain(
    `data/plugin_entry.html?name=${name}`
  );
}

/**
 * A Component used to test that custom error templates can be passed to
 * the `plugins` component.
 */
@Component({
  standalone: false,
  template: `
    <ng-template #environmentFailureNotFoundTemplate>
      <h3 class="custom-not-found-template">Custom Not Found Error</h3>
    </ng-template>
    <ng-template #environmentFailurePermissionDeniedTemplate>
      <h3 class="custom-not-found-template">Custom Permission Denied Error</h3>
    </ng-template>
    <ng-template #environmentFailureUnknownTemplate>
      <h3 class="custom-unknown-template">Custom Unknown Error</h3>
    </ng-template>
    <plugins
      [environmentFailureNotFoundTemplate]="environmentFailureNotFoundTemplate"
      [environmentFailurePermissionDeniedTemplate]="
        environmentFailurePermissionDeniedTemplate
      "
      [environmentFailureUnknownTemplate]="environmentFailureUnknownTemplate"
    >
    </plugins>
  `,
})
class CustomizedErrorTemplatesComponent {}

class TestableCustomElement extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({mode: 'open'});
    const wrapper = document.createElement('div');
    wrapper.textContent = 'Test TensorBoard';
    shadow.appendChild(wrapper);
  }
}

customElements.define('tb-bar', TestableCustomElement);

interface TbElement extends HTMLElement {
  reload: () => void;
}

describe('plugins_component', () => {
  let store: MockStore<State>;
  let createElementSpy: jasmine.Spy;

  const PLUGINS = {
    bar: {
      disable_reload: false,
      enabled: true,
      loading_mechanism: {
        type: LoadingMechanismType.CUSTOM_ELEMENT,
        element_name: 'tb-bar',
      } as CustomElementLoadingMechanism,
      tab_name: 'Bar',
      remove_dom: false,
    },
    'extra-plugin': {
      disable_reload: false,
      enabled: true,
      loading_mechanism: {
        type: LoadingMechanismType.NG_COMPONENT,
      } as NgElementLoadingMechanism,
      tab_name: 'Extra',
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
      } as IframeLoadingMechanism,
      tab_name: 'Bar',
      remove_dom: false,
    },
  };

  afterEach(() => {
    store?.resetSelectors();
  });

  function setActivePlugin(plugin: PluginId) {
    store.overrideSelector(getActivePlugin, plugin);
    store.refreshState();
  }

  /**
   * Configures default behavior of the MockStore.
   * Call this only after all providers have been configured as it will freeze
   * the TestBed configuration.
   */
  async function setup(providersOverride?: any[]) {
    await TestBed.configureTestingModule({
      providers: [
        provideMockTbStore(),
        PluginsContainer,
        PluginRegistryModule,
        getTestingProvider(),
        ...(providersOverride ? providersOverride : []),
      ],
      declarations: [
        PluginsContainer,
        PluginsComponent,
        CustomizedErrorTemplatesComponent,
      ],
      imports: [TestingDebuggerModule, ExtraDashboardModule],
    });

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getPlugins, PLUGINS);
    store.overrideSelector(getActivePlugin, null);
    store.overrideSelector(getPluginsListLoaded, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
      failureCode: null,
    });
    store.overrideSelector(getEnvironment, {
      data_location: 'foobar',
      window_title: 'Tests!',
    });
    store.overrideSelector(getIsFeatureFlagsLoaded, true);
    store.overrideSelector(getFeatureFlags, buildFeatureFlag());
    store.overrideSelector(getAppLastLoadedTimeInMs, null);
    store.overrideSelector(
      settingsSelectors.getSettingsLoadState,
      DataLoadState.LOADED
    );

    createElementSpy = spyOn(document, 'createElement').and.callThrough();
    createElementSpy
      .withArgs('tf-experimental-plugin-host-lib')
      .and.returnValue({
        registerPluginIframe: () => {},
      });
  }

  describe('plugin DOM creation', () => {
    beforeEach(async () => {
      await setup();
    });

    it('creates no plugin when there is no activePlugin', () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();
      const el = fixture.debugElement.query(By.css('.plugins'));
      expect(el.nativeElement.childElementCount).toBe(0);
    });

    it('creates no plugin when plugins are not loaded', () => {
      store.overrideSelector(getPlugins, {});
      store.overrideSelector(getActivePlugin, 'foo');
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();
      const el = fixture.debugElement.query(By.css('.plugins'));
      expect(el.nativeElement.childElementCount).toBe(0);
    });

    it('waits for feature flags to be loaded before creating plugin', async () => {
      store.overrideSelector(getIsFeatureFlagsLoaded, false);
      store.overrideSelector(getActivePlugin, 'foo');

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins1 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins1.nativeElement.childElementCount).toBe(0);

      store.overrideSelector(getIsFeatureFlagsLoaded, true);
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins2 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins2.nativeElement.childElementCount).toBe(1);
    });

    it('waits for settings to be loaded before creating plugin', async () => {
      store.overrideSelector(
        settingsSelectors.getSettingsLoadState,
        DataLoadState.NOT_LOADED
      );
      store.overrideSelector(getActivePlugin, 'foo');

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins1 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins1.nativeElement.childElementCount).toBe(0);

      store.overrideSelector(
        settingsSelectors.getSettingsLoadState,
        DataLoadState.LOADING
      );
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins2 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins2.nativeElement.childElementCount).toBe(0);

      store.overrideSelector(
        settingsSelectors.getSettingsLoadState,
        DataLoadState.LOADED
      );
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins3 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins3.nativeElement.childElementCount).toBe(1);
    });

    it('creates plugin when settings fails to load', async () => {
      store.overrideSelector(
        settingsSelectors.getSettingsLoadState,
        DataLoadState.NOT_LOADED
      );
      store.overrideSelector(getActivePlugin, 'foo');

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins1 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins1.nativeElement.childElementCount).toBe(0);

      store.overrideSelector(
        settingsSelectors.getSettingsLoadState,
        DataLoadState.FAILED
      );
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
      const plugins3 = fixture.debugElement.query(By.css('.plugins'));
      expect(plugins3.nativeElement.childElementCount).toBe(1);
    });

    it('creates an element for CUSTOM_ELEMENT type of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      setActivePlugin('bar');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const pluginElement = nativeElement.children[0];
      expect(pluginElement.tagName).toBe('TB-BAR');
    });

    it('creates an element for IFRAME type of plugin', async () => {
      const pluginApiHost = TestBed.inject(PluginApiHostModule);
      const registerPluginIframeSpy = spyOn(
        pluginApiHost,
        'registerPluginIframe'
      );
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      setActivePlugin('foo');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const pluginElement = nativeElement.children[0];
      expectPluginIframe(pluginElement, 'foo');
      expect(registerPluginIframeSpy).toHaveBeenCalledWith(
        pluginElement,
        'foo'
      );
    });

    it('keeps instance of plugin after being inactive but hides it', async () => {
      const fixture = TestBed.createComponent(PluginsContainer);
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
      expectPluginIframe(fooElement, 'foo');
      expect(fooElement.style.visibility).toBe('hidden');
      expect(barElement.tagName).toBe('TB-BAR');
      expect(barElement.style.visibility).not.toBe('hidden');
    });

    it('does not create same instance of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsContainer);
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
      const [fooElement] = nativeElement.children;
      expectPluginIframe(fooElement, 'foo');
      expect(fooElement.style.visibility).not.toBe('hidden');
    });

    it('creates components for plugins registered dynamically', async () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      setActivePlugin('extra-plugin');

      fixture.detectChanges();
      await fixture.whenStable();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      expect(nativeElement.childElementCount).toBe(1);
      const pluginElement = nativeElement.children[0];
      expect(pluginElement.tagName).toBe('EXTRA-DASHBOARD');
    });

    it('hides inactive plugin but keeps their width', async () => {
      setActivePlugin('bar');

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      setActivePlugin('foo');
      fixture.detectChanges();

      const {nativeElement} = fixture.debugElement.query(By.css('.plugins'));
      const [barElement] = nativeElement.children;
      expect(barElement.shadowRoot.firstElementChild.textContent).toBe(
        'Test TensorBoard'
      );
      expect(
        barElement.shadowRoot.firstElementChild.clientWidth
      ).toBeGreaterThan(0);
    });

    it('assigns feature flags to CUSTOM_ELEMENT plugins', async () => {
      store.overrideSelector(
        getFeatureFlags,
        buildFeatureFlag({inColab: true})
      );
      setActivePlugin('bar');

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      const pluginElement = fixture.debugElement.query(By.css('.plugins'))
        .children[0].nativeNode;
      expect((pluginElement as any).featureFlags).toEqual(
        buildFeatureFlag({inColab: true})
      );
    });
  });

  describe('plugin DOM creation without PluginApiHostModule', () => {
    beforeEach(async () => {
      // Provide no PluginApiHostModule instance.
      await setup([{provide: PluginApiHostModule, useValue: null}]);
    });

    it('throws error for IFRAME type of plugin', async () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      setActivePlugin('foo');

      expect(() => fixture.detectChanges()).toThrow(
        new Error('IFRAME-based plugins not supported: foo')
      );
    });
  });

  describe('reload', () => {
    function setLastLoadedTime(
      timeInMs: number | null,
      state = DataLoadState.LOADED
    ) {
      store.overrideSelector(getPluginsListLoaded, {
        state:
          timeInMs !== null ? DataLoadState.LOADED : DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: timeInMs,
        failureCode: null,
      });
      store.overrideSelector(getAppLastLoadedTimeInMs, timeInMs);
      store.refreshState();
    }

    let alphaEl: TbElement;
    let betaEl: TbElement;
    let gammaEl: TbElement;

    beforeEach(async () => {
      await setup();
      const PLUGINS = {
        alpha: {
          disable_reload: false,
          enabled: true,
          loading_mechanism: {
            type: LoadingMechanismType.CUSTOM_ELEMENT,
            element_name: 'tb-alpha',
          } as CustomElementLoadingMechanism,
          tab_name: 'Alpha',
          remove_dom: false,
        },
        beta: {
          disable_reload: false,
          enabled: true,
          loading_mechanism: {
            type: LoadingMechanismType.CUSTOM_ELEMENT,
            element_name: 'tb-beta',
          } as CustomElementLoadingMechanism,
          tab_name: 'Beta',
          remove_dom: false,
        },
        gamma: {
          disable_reload: true,
          enabled: true,
          loading_mechanism: {
            type: LoadingMechanismType.CUSTOM_ELEMENT,
            element_name: 'tb-gamma',
          } as CustomElementLoadingMechanism,
          tab_name: 'Gamma',
          remove_dom: false,
        },
        zeta: {
          disable_reload: true,
          enabled: true,
          loading_mechanism: {
            type: LoadingMechanismType.NONE,
          } as NoLoadingMechanism,
          tab_name: 'zeta',
          remove_dom: false,
        },
      };
      store.overrideSelector(getPlugins, PLUGINS);

      alphaEl = document.createElement('span') as any;
      alphaEl.reload = jasmine.createSpy();
      betaEl = document.createElement('span') as any;
      betaEl.reload = jasmine.createSpy();
      gammaEl = document.createElement('span') as any;
      gammaEl.reload = jasmine.createSpy();

      createElementSpy.withArgs('tb-alpha').and.returnValue(alphaEl);
      createElementSpy.withArgs('tb-beta').and.returnValue(betaEl);
      createElementSpy.withArgs('tb-gamma').and.returnValue(gammaEl);
    });

    it('invokes reload on initial page render and new plugin stamp', () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      // When TensorBoard starts, the new dashboard is stamped only after plugins
      // listing is loaded and thus the last loaded time is not zero.
      setLastLoadedTime(100, DataLoadState.LOADED);
      fixture.detectChanges();

      setActivePlugin('alpha');
      fixture.detectChanges();

      expect(alphaEl.reload).toHaveBeenCalledTimes(1);

      // Without changing the lastLoadedTime, stamp a new dashboard.
      setActivePlugin('beta');
      fixture.detectChanges();

      expect(betaEl.reload).toHaveBeenCalledTimes(1);

      // Even for the plugin that disabled the auto reload, it should invoke reload once
      // at the stamp time.
      setActivePlugin('gamma');
      fixture.detectChanges();

      expect(gammaEl.reload).toHaveBeenCalledTimes(1);
    });

    it('does not break when acitvePlugin id changes to one without UI', () => {
      const fixture = TestBed.createComponent(PluginsContainer);
      setLastLoadedTime(100, DataLoadState.LOADED);
      fixture.detectChanges();

      setActivePlugin('alpha');
      fixture.detectChanges();

      // zeta does not have a DOM and it definitely cannot have `reload` method called.
      setActivePlugin('zeta');
      fixture.detectChanges();
    });

    it('invokes reload method on the dashboard DOM on data load time changes', () => {
      const fixture = TestBed.createComponent(PluginsContainer);

      setLastLoadedTime(null, DataLoadState.NOT_LOADED);
      setActivePlugin('alpha');
      fixture.detectChanges();
      setActivePlugin('beta');
      fixture.detectChanges();
      setActivePlugin('alpha');
      fixture.detectChanges();

      // Initial stamp reloads.
      expect(alphaEl.reload).toHaveBeenCalledTimes(1);
      expect(betaEl.reload).toHaveBeenCalledTimes(1);

      setLastLoadedTime(1);
      fixture.detectChanges();
      expect(alphaEl.reload).toHaveBeenCalledTimes(2);
      expect(betaEl.reload).toHaveBeenCalledTimes(1);

      setLastLoadedTime(1);
      fixture.detectChanges();
      expect(alphaEl.reload).toHaveBeenCalledTimes(2);
      expect(betaEl.reload).toHaveBeenCalledTimes(1);

      setLastLoadedTime(2);
      fixture.detectChanges();
      expect(alphaEl.reload).toHaveBeenCalledTimes(3);
      expect(betaEl.reload).toHaveBeenCalledTimes(1);

      setActivePlugin('beta');
      fixture.detectChanges();

      setLastLoadedTime(3);
      fixture.detectChanges();
      expect(alphaEl.reload).toHaveBeenCalledTimes(3);
      expect(betaEl.reload).toHaveBeenCalledTimes(2);
    });

    it('does not invoke reload method on dom if disable_reload', () => {
      const fixture = TestBed.createComponent(PluginsContainer);

      setLastLoadedTime(100, DataLoadState.NOT_LOADED);
      setActivePlugin('gamma');
      fixture.detectChanges();

      expect(gammaEl.reload).toHaveBeenCalledTimes(1);

      setLastLoadedTime(1);
      fixture.detectChanges();

      expect(gammaEl.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning pages', () => {
    beforeEach(async () => {
      await setup();
    });

    it('does not show any warning while fetching when list was never fetched', () => {
      store.overrideSelector(getPlugins, {});
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
        failureCode: null,
      });
      store.overrideSelector(getActivePlugin, null);

      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.warning'))).toBeNull();
    });

    it('shows warning when plugin id is not known', () => {
      store.overrideSelector(getActivePlugin, 'you_do_not_know_me');
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 123,
        failureCode: null,
      });
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.nativeElement.textContent).toContain(
        'There’s no dashboard by the name of “you_do_not_know_me”'
      );
    });

    it(
      'shows warning when plugin id is not known when pluginList is cached and' +
        'is loading (updating)',
      () => {
        store.overrideSelector(getPlugins, PLUGINS);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 123,
          failureCode: null,
        });
        store.overrideSelector(getActivePlugin, 'you_do_not_know_me');
        const fixture = TestBed.createComponent(PluginsContainer);
        fixture.detectChanges();

        expect(fixture.debugElement.nativeElement.textContent).toContain(
          'There’s no dashboard by the name of “you_do_not_know_me”'
        );
      }
    );

    it('shows warning when environment failed NOT_FOUND', () => {
      store.overrideSelector(getActivePlugin, null);
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: null,
        failureCode: PluginsListFailureCode.NOT_FOUND,
      });
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.nativeElement.textContent).toContain(
        'Data could not be loaded.'
      );
    });

    it('shows warning when environment failed PERMISSION_DENIED', () => {
      store.overrideSelector(getActivePlugin, null);
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: null,
        failureCode: PluginsListFailureCode.PERMISSION_DENIED,
      });
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.nativeElement.textContent).toContain(
        'Data could not be loaded.'
      );
    });

    it('shows warning when environment failed UNKNOWN', () => {
      store.overrideSelector(getActivePlugin, null);
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.FAILED,
        lastLoadedTimeInMs: null,
        failureCode: PluginsListFailureCode.UNKNOWN,
      });
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.nativeElement.textContent).toContain(
        'Data could not be loaded.'
      );
    });

    it(
      'shows no active plugin warning even when loading when list was previous ' +
        'loaded',
      () => {
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: 123,
          failureCode: null,
        });
        const fixture = TestBed.createComponent(PluginsContainer);
        fixture.detectChanges();

        expect(fixture.debugElement.nativeElement.textContent).toContain(
          'No dashboards are active for the current data set.'
        );
      }
    );

    it('shows warning when no plugin is active after list is loaded', () => {
      store.overrideSelector(getActivePlugin, null);
      store.overrideSelector(getPluginsListLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 123,
        failureCode: null,
      });
      const fixture = TestBed.createComponent(PluginsContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.nativeElement.textContent).toContain(
        'No dashboards are active for the current data set.'
      );
    });

    describe('custom error templates', () => {
      it('shows warning when environment failed NOT_FOUND', () => {
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        });
        const fixture = TestBed.createComponent(
          CustomizedErrorTemplatesComponent
        );
        fixture.detectChanges();

        expect(fixture.debugElement.nativeElement.textContent).toBe(
          'Custom Not Found Error'
        );
      });

      it('shows warning when environment failed PERMISSION_DENIED', () => {
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.PERMISSION_DENIED,
        });
        const fixture = TestBed.createComponent(
          CustomizedErrorTemplatesComponent
        );
        fixture.detectChanges();

        expect(fixture.debugElement.nativeElement.textContent).toBe(
          'Custom Permission Denied Error'
        );
      });

      it('shows warning when environment failed UNKNOWN', () => {
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.UNKNOWN,
        });
        const fixture = TestBed.createComponent(
          CustomizedErrorTemplatesComponent
        );
        fixture.detectChanges();

        expect(fixture.debugElement.nativeElement.textContent).toBe(
          'Custom Unknown Error'
        );
      });
    });

    describe('data location', () => {
      it('rendersin the warning', () => {
        store.overrideSelector(getEnvironment, {
          data_location: 'my-location',
          window_title: '',
        });
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 123,
          failureCode: null,
        });
        const fixture = TestBed.createComponent(PluginsContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.data-location')).nativeElement
            .textContent
        ).toBe('Log directory: my-location');
      });

      it('does not render when it is empty', () => {
        store.overrideSelector(getEnvironment, {
          data_location: '',
          window_title: '',
        });
        store.overrideSelector(getActivePlugin, null);
        store.overrideSelector(getPluginsListLoaded, {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 123,
          failureCode: null,
        });
        const fixture = TestBed.createComponent(PluginsContainer);
        fixture.detectChanges();

        expect(fixture.debugElement.query(By.css('.data-location'))).toBeNull();
      });
    });
  });
});
