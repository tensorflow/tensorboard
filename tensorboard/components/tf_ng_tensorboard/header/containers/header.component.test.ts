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
import {DebugElement} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSelectModule} from '@angular/material/select';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {HeaderComponent} from './header.component';

import {changePlugin} from '../../core/core.actions';
import {State, CoreState, CORE_FEATURE_KEY} from '../../core/core.reducers';
import {createPluginMetadata} from '../../core/test_util';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('header.component', () => {
  let store: MockStore<State>;

  function createCoreState(): CoreState {
    return {
      activePlugin: null,
      plugins: {
        foo: createPluginMetadata('Foo Fighter'),
        bar: createPluginMetadata('Barber'),
      },
    };
  }

  function createInitialState(coreState: CoreState = createCoreState()): State {
    return {
      [CORE_FEATURE_KEY]: coreState,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatTabsModule,
        MatToolbarModule,
        NoopAnimationsModule,
        MatSelectModule,
      ],
      providers: [
        provideMockStore({initialState: createInitialState()}),
        HeaderComponent,
      ],
      declarations: [HeaderComponent],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  function assertDebugElementText(el: DebugElement, text: string) {
    expect(el.nativeElement.innerText.trim().toUpperCase()).toBe(text);
  }

  it('renders pluginsList', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const els = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(els.length).toBe(2);

    assertDebugElementText(els[0], 'FOO FIGHTER');
    assertDebugElementText(els[1], 'BARBER');
  });

  it('updates list of tabs when pluginsList updates', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const coreState = {
      ...createCoreState(),
      plugins: {
        cat: createPluginMetadata('Meow'),
        dog: createPluginMetadata('Woof'),
        elephant: createPluginMetadata('Trumpet'),
      },
    };
    const nextState = createInitialState(coreState);
    store.setState(nextState);
    fixture.detectChanges();
    await fixture.whenStable();

    const els = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
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

    const coreState = {
      ...createCoreState(),
      activePlugin: 'bar',
    };
    const nextState = createInitialState(coreState);
    store.setState(nextState);
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(1);
  });

  it('fires an action when a tab is clicked', async () => {
    const dispatch = spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const [, debugEl] = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    debugEl.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(changePlugin({plugin: 'bar'}));
  });
});
