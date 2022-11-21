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
/**
 * Unit tests for the NPMI Container.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {createCoreState, createState} from '../../core/testing';
import {getCurrentRouteRunSelection} from './../../selectors';
import {NpmiComponent} from './npmi_component';
import {NpmiContainer} from './npmi_container';
import {getViewActive} from './store';
import {ViewActive} from './store/npmi_types';
import {appStateFromNpmiState, createNpmiState} from './testing';

describe('Npmi Container', () => {
  let store: MockStore<State>;
  const css = {
    INACTIVE_VIEW: By.css('npmi-inactive-view'),
    MAIN_COMPONENT: By.css('npmi-main'),
    EMBEDDINGS_COMPONENT: By.css('npmi-embeddings'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NpmiComponent, NpmiContainer],
      providers: [
        provideMockStore({
          initialState: {
            ...createState(createCoreState()),
            ...appStateFromNpmiState(createNpmiState()),
          },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi component initially with inactive component', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(css.INACTIVE_VIEW);
    expect(inactiveElement).toBeTruthy();
    const mainElement = fixture.debugElement.query(css.MAIN_COMPONENT);
    expect(mainElement).toBeNull();
    const embeddingsElement = fixture.debugElement.query(
      css.EMBEDDINGS_COMPONENT
    );
    expect(embeddingsElement).toBeNull();
  });

  it('renders npmi component', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([['run_1', true]])
    );
    store.overrideSelector(getViewActive, ViewActive.DEFAULT);
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(css.INACTIVE_VIEW);
    expect(inactiveElement).toBeNull();
    const npmiElement = fixture.debugElement.query(css.MAIN_COMPONENT);
    expect(npmiElement).toBeTruthy();
    const embeddingsElement = fixture.debugElement.query(
      css.EMBEDDINGS_COMPONENT
    );
    expect(embeddingsElement).toBeNull();
  });

  it('renders embeddings component', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([['run_1', true]])
    );
    store.overrideSelector(getViewActive, ViewActive.EMBEDDINGS);
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(css.INACTIVE_VIEW);
    expect(inactiveElement).toBeNull();
    const npmiElement = fixture.debugElement.query(css.MAIN_COMPONENT);
    expect(npmiElement).toBeNull();
    const embeddingsElement = fixture.debugElement.query(
      css.EMBEDDINGS_COMPONENT
    );
    expect(embeddingsElement).toBeTruthy();
  });
});
