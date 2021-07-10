/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Component, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../state';
import {getEnvironment} from '../store';
import {RouteKind} from '../../app_routing/types';
import {buildExperiment} from '../../experiments/store/testing';
import {
  getRouteKind,
  getExperimentIdsFromRoute,
  getExperiment,
} from '../../selectors';
import {TB_SERVICE_NAME} from '../types';

import {PageTitleModule} from './page_title_module';
import {PageTitleComponent} from './page_title_component';
import {PageTitleContainer} from './page_title_container';

describe('page title test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageTitleComponent, PageTitleContainer],
      providers: [provideMockStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: '',
    });
  });

  it('uses window_title as page title if given', () => {
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: 'I will be overwritten by the window_title',
      })
    );
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: 'I am the real title',
    });
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(document.title).toBe('I am the real title');
  });

  it('uses experiment name as tab title for experiment routes', () => {
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: 'All you need is TensorBoard',
      })
    );
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(document.title).toBe('All you need is TensorBoard');
  });

  it('uses `Tensorboard` as default tab title', () => {
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(document.title).toBe('TensorBoard');
  });
});

@Component({
  selector: 'my-tester',
  template: ` <page-title></page-title> `,
})
class TestingComponent {}

describe('page title test for custom services', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageTitleModule],
      declarations: [TestingComponent],
      providers: [
        provideMockStore(),
        {
          provide: TB_SERVICE_NAME,
          useValue: 'corp',
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: '',
    });
  });

  it('specifies TensorBoard service name in tab title if given', () => {
    const fixture = TestBed.createComponent(TestingComponent);
    fixture.detectChanges();

    expect(document.title).toBe('TensorBoard.corp');
  });
});
