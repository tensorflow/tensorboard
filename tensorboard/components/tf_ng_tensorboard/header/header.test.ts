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

import {HeaderComponent} from './components/header.component';
import {HeaderContainer} from './containers/header.component';

import {changePlugin} from '../core/core.actions';
import {State} from '../core/core.reducers';
import {
  createPluginMetadata,
  createState,
  createCoreState,
} from '../core/testing';
import {PluginId} from '../types/api';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('header test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatTabsModule,
        MatToolbarModule,
        NoopAnimationsModule,
        MatSelectModule,
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
        HeaderContainer,
      ],
      declarations: [HeaderComponent, HeaderContainer],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  function assertDebugElementText(el: DebugElement, text: string) {
    expect(el.nativeElement.innerText.trim().toUpperCase()).toBe(text);
  }

  function setActivePlugin(activePlugin: PluginId) {
    store.setState(
      createState(
        createCoreState({
          plugins: {
            foo: createPluginMetadata('Foo Fighter'),
            bar: createPluginMetadata('Barber'),
          },
          activePlugin,
        })
      )
    );
  }

  it('renders pluginsList', () => {
    const fixture = TestBed.createComponent(HeaderContainer);
    fixture.detectChanges();

    const els = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    expect(els.length).toBe(2);

    assertDebugElementText(els[0], 'FOO FIGHTER');
    assertDebugElementText(els[1], 'BARBER');
  });

  it('updates list of tabs when pluginsList updates', async () => {
    const fixture = TestBed.createComponent(HeaderContainer);
    fixture.detectChanges();

    const nextState = createState(
      createCoreState({
        plugins: {
          cat: createPluginMetadata('Meow'),
          dog: createPluginMetadata('Woof'),
          elephant: createPluginMetadata('Trumpet'),
        },
      })
    );
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
    const fixture = TestBed.createComponent(HeaderContainer);
    fixture.detectChanges();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(0);
  });

  it('sets tab group selection to match index of activePlugin', async () => {
    const fixture = TestBed.createComponent(HeaderContainer);
    fixture.detectChanges();

    setActivePlugin('bar');
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.debugElement.query(By.css('mat-tab-group'));
    expect(group.componentInstance.selectedIndex).toBe(1);
  });

  it('fires an action when a tab is clicked', async () => {
    const dispatch = spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(HeaderContainer);
    fixture.detectChanges();

    const [, barEl] = fixture.debugElement.queryAll(By.css('.mat-tab-label'));
    barEl.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(changePlugin({plugin: 'bar'}));
  });
});
