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
import {DebugElement, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {changePlugin, manualReload} from '../core/actions';
import {State} from '../core/store';
import {
  getActivePlugin,
  getAppLastLoadedTimeInMs,
  getCoreDataLoadedState,
  getPlugins,
} from '../core/store/core_selectors';
import {
  buildPluginMetadata,
  createCoreState,
  createPluginMetadata,
  createState,
} from '../core/testing';
import {MatIconTestingModule} from '../testing/mat_icon_module';
import {PluginId} from '../types/api';
import {DataLoadState} from '../types/data';
import {HeaderComponent} from './header_component';
import {PluginSelectorComponent} from './plugin_selector_component';
import {PluginSelectorContainer} from './plugin_selector_container';
import {ReloadContainer} from './reload_container';

describe('header test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatButtonModule,
        MatIconTestingModule,
        MatSelectModule,
        MatTabsModule,
        MatToolbarModule,
        NoopAnimationsModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              plugins: {
                foo: createPluginMetadata('Foo Fighter'),
                bar: createPluginMetadata('Barber'),
              },
            })
          ),
        }),
        HeaderComponent,
      ],
      declarations: [
        HeaderComponent,
        PluginSelectorComponent,
        PluginSelectorContainer,
        ReloadContainer,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getPlugins, {
      foo: createPluginMetadata('Foo Fighter'),
      bar: createPluginMetadata('Barber'),
    });
    store.overrideSelector(getActivePlugin, 'foo');
    store.overrideSelector(getAppLastLoadedTimeInMs, null);
    store.overrideSelector(getCoreDataLoadedState, DataLoadState.NOT_LOADED);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function assertDebugElementText(el: DebugElement, text: string) {
    expect(el.nativeElement.innerText.trim().toUpperCase()).toBe(text);
  }

  function setActivePlugin(activePlugin: PluginId | null) {
    store.overrideSelector(getActivePlugin, activePlugin);
    store.refreshState();
  }

  it('renders pluginsList', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const els = fixture.debugElement.queryAll(By.css('.mat-mdc-tab'));
    expect(els.length).toBe(2);

    assertDebugElementText(els[0], 'FOO FIGHTER');
    assertDebugElementText(els[1], 'BARBER');
  });

  it('updates list of tabs when pluginsList updates', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    store.overrideSelector(getPlugins, {
      cat: createPluginMetadata('Meow'),
      dog: createPluginMetadata('Woof'),
      elephant: createPluginMetadata('Trumpet'),
    });
    setActivePlugin(null);
    fixture.detectChanges();
    await fixture.whenStable();

    const els = fixture.debugElement.queryAll(By.css('.mat-mdc-tab'));
    expect(els.length).toBe(3);
    assertDebugElementText(els[0], 'MEOW');
    assertDebugElementText(els[1], 'WOOF');
    assertDebugElementText(els[2], 'TRUMPET');
  });

  it('selects 0th element by default', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(0);
  });

  it('sets tab group selection to match index of activePlugin', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    setActivePlugin('bar');
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(1);
  });

  it('fires an action when a tab is clicked', async () => {
    const dispatch = spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const [, barEl] = fixture.debugElement.queryAll(By.css('.plugin-name'));
    barEl.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(changePlugin({plugin: 'bar'}));
  });

  describe('reload', () => {
    it('dispatches manual reload when clicking on the reload button', () => {
      const dispatch = spyOn(store, 'dispatch');
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      button.nativeElement.click();
      fixture.detectChanges();

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(manualReload());
    });

    it('renders the time of refresh in title', () => {
      store.overrideSelector(getCoreDataLoadedState, DataLoadState.LOADED);
      store.overrideSelector(
        getAppLastLoadedTimeInMs,
        new Date('2000-01-01').getTime()
      );
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(button.properties['title']).toBe(
        'Last Updated: Jan 1, 2000, 12:00:00 AM'
      );
    });

    it('renders "Loading" if it was never loaded before', () => {
      store.overrideSelector(getCoreDataLoadedState, DataLoadState.NOT_LOADED);
      store.overrideSelector(getAppLastLoadedTimeInMs, null);
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(button.properties['title']).toBe('Loading...');
    });

    it('spins the indicator when loading', () => {
      store.overrideSelector(getCoreDataLoadedState, DataLoadState.NOT_LOADED);
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const buttonBefore = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonBefore.classes['loading']).not.toBeDefined();

      store.overrideSelector(getCoreDataLoadedState, DataLoadState.LOADING);
      store.refreshState();
      fixture.detectChanges();

      const buttonAfter = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonAfter.classes['loading']).toBe(true);
    });

    it('stops spinner when going from loading to loaded', () => {
      store.overrideSelector(getCoreDataLoadedState, DataLoadState.LOADING);
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const buttonBefore = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonBefore.classes['loading']).toBe(true);

      store.overrideSelector(getCoreDataLoadedState, DataLoadState.LOADED);
      store.refreshState();
      fixture.detectChanges();

      const buttonAfter = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonAfter.classes['loading']).not.toBeDefined();
    });

    it('disables the reload button if active plugin does not want reload', () => {
      store.overrideSelector(getPlugins, {
        foo: buildPluginMetadata({
          disable_reload: true,
          tab_name: 'Foo',
        }),
      });
      store.overrideSelector(getActivePlugin, 'foo');
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(button.attributes['disabled']).toBe('true');
    });

    it('does not spin the spinner when reload is disabled', () => {
      store.overrideSelector(getCoreDataLoadedState, DataLoadState.LOADING);
      store.overrideSelector(getPlugins, {
        foo: buildPluginMetadata({
          disable_reload: true,
          tab_name: 'Foo',
        }),
      });
      store.overrideSelector(getActivePlugin, 'foo');
      const fixture = TestBed.createComponent(HeaderComponent);
      fixture.detectChanges();

      const buttonBefore = fixture.debugElement.query(
        By.css('app-header-reload button')
      );
      expect(buttonBefore.classes['loading']).not.toBeDefined();
    });
  });
});
