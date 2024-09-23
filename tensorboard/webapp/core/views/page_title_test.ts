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
import {MockStore} from '@ngrx/store/testing';
import {RouteKind} from '../../app_routing/types';
import {buildExperiment} from '../../experiments/store/testing';
import {
  getExperiment,
  getExperimentIdsFromRoute,
  getRouteKind,
} from '../../selectors';
import {provideMockTbStore} from '../../testing/utils';
import {State} from '../state';
import {getEnvironment} from '../store';
import {TB_BRAND_NAME} from '../types';
import {PageTitleComponent, TEST_ONLY} from './page_title_component';
import {PageTitleContainer} from './page_title_container';
import {PageTitleModule} from './page_title_module';

describe('page title test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageTitleComponent, PageTitleContainer],
      providers: [provideMockTbStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENTS);
    store.overrideSelector(getExperimentIdsFromRoute, []);
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: '',
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('uses window_title as page title if given', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
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

    expect(spy).toHaveBeenCalledWith('I am the real title');
  });

  it('includes experiment name in page title for experiment routes', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: 'All you need is TensorBoard',
      })
    );
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(
      'All you need is TensorBoard - TensorBoard'
    );
  });

  it('uses `Tensorboard` as default page title', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('TensorBoard');
  });

  it('uses default page title for comparison routes', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.COMPARE_EXPERIMENT);
    const fixture = TestBed.createComponent(PageTitleContainer);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('TensorBoard');
  });
});

@Component({
  standalone: false,
  selector: 'my-tester',
  template: ` <page-title></page-title> `,
})
class TestingComponent {}

describe('page title test with custom brand names', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageTitleModule],
      declarations: [TestingComponent],
      providers: [
        provideMockTbStore(),
        {
          provide: TB_BRAND_NAME,
          useValue: 'TensorBoard.corp',
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENTS);
    store.overrideSelector(getExperimentIdsFromRoute, []);
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: '',
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('uses TensorBoard brand name as page title as default', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    const fixture = TestBed.createComponent(TestingComponent);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('TensorBoard.corp');
  });

  it('specifies TensorBoard brand name in page title after experiment name', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: 'Testing Brand Name',
      })
    );
    const fixture = TestBed.createComponent(TestingComponent);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('Testing Brand Name - TensorBoard.corp');
  });

  it('changes page title accordingly when navigating away from single experiment dashboard', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['123']);
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: 'Yet another net',
      })
    );
    const fixture1 = TestBed.createComponent(TestingComponent);
    fixture1.detectChanges();

    expect(spy).toHaveBeenCalledWith('Yet another net - TensorBoard.corp');

    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENTS);
    const fixture2 = TestBed.createComponent(TestingComponent);
    fixture2.detectChanges();

    expect(spy).toHaveBeenCalledWith('TensorBoard.corp');
  });
});

describe('page title test for OSS TensorBoard', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageTitleModule],
      declarations: [TestingComponent],
      providers: [
        provideMockTbStore(),
        {
          provide: TB_BRAND_NAME,
          useValue: 'TensorBoard',
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENTS);
    store.overrideSelector(getExperimentIdsFromRoute, []);
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(getEnvironment, {
      data_location: 'my-location',
      window_title: '',
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('uses `TensorBoard` for experiment page title', () => {
    const spy = spyOn(TEST_ONLY.utils, 'setDocumentTitle');
    store.overrideSelector(getRouteKind, RouteKind.EXPERIMENT);
    store.overrideSelector(getExperimentIdsFromRoute, ['defaultExperimentId']);
    store.overrideSelector(
      getExperiment,
      buildExperiment({
        name: '', // OSS default experiment name is ''
      })
    );
    const fixture = TestBed.createComponent(TestingComponent);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('TensorBoard');
  });
});
