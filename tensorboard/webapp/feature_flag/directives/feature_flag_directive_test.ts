/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {
  Component,
  DebugElement,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';

import {provideMockTbStore} from '../../testing/utils';
import {FEATURE_FLAGS_HEADER_NAME} from '../http/const';
import {getFeatureFlagsToSendToServer} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';

import {
  FeatureFlagHrefDirective,
  FeatureFlagImgDirective,
} from './feature_flag_directive';

@Component({
  selector: 'test',
  template: `<p>{{ value }}</p>`,
})
export class TestComponent implements OnChanges {
  @Input() value!: string;

  ngOnChanges(changes: {}): any {}
}

@Component({
  selector: 'test-with-href',
  template: '<a [href]="valueFromHost">testable link</a>',
})
class TestableHrefComponent {
  @ViewChild(
    TestComponent
  ) /* using viewChild we get access to the TestComponent which is a child of TestHostComponent */
  public testComponent: any;
  public valueFromHost!: string; /* this is the variable which is passed as input to the TestComponent */
}

@Component({
  selector: 'test-with-img',
  template: '<img [src]="valueFromHost">',
})
class TestableImgComponent {
  @ViewChild(
    TestComponent
  ) /* using viewChild we get access to the TestComponent which is a child of TestHostComponent */
  public testComponent: any;
  public valueFromHost!: string; /* this is the variable which is passed as input to the TestComponent */
}

describe('feature_flags', () => {
  let store: MockStore<FeatureFlagState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideMockTbStore()],
      declarations: [
        TestComponent,
        FeatureFlagHrefDirective,
        TestableHrefComponent,
        FeatureFlagImgDirective,
        TestableImgComponent,
      ],
    }).compileComponents();

    store = TestBed.inject<Store<FeatureFlagState>>(
      Store
    ) as MockStore<FeatureFlagState>;
    store.overrideSelector(getFeatureFlagsToSendToServer, {});
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createHrefComponent(href: string): DebugElement {
    const fixture = TestBed.createComponent(TestableHrefComponent);
    const hostComponent = fixture.componentInstance;
    hostComponent.valueFromHost = href;
    const component = hostComponent.testComponent;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('a'));
  }

  function createImgComponent(src: string): DebugElement {
    const fixture = TestBed.createComponent(TestableImgComponent);
    const hostComponent = fixture.componentInstance;
    hostComponent.valueFromHost = src;
    const component = hostComponent.testComponent;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('img'));
  }

  it('injects feature flags in <img> tags if any are set', () => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createImgComponent('https://abc.def');
    expect(anchorStr.attributes['src']).toBe(
      'https://abc.def?tensorBoardFeatureFlags=%7B%22inColab%22%3Atrue%7D'
    );
  });

  it('leaves <img> tags unmodified if no feature flags are set', () => {
    const anchorStr = createImgComponent('https://abc.def');
    expect(anchorStr.attributes['src']).toBe('https://abc.def');
  });

  it('injects feature flags in <a> tags if any are set', () => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createHrefComponent('https://abc.def');
    expect(anchorStr.attributes['href']).toBe(
      'https://abc.def?tensorBoardFeatureFlags=%7B%22inColab%22%3Atrue%7D'
    );
  });

  it('leaves <a> tags unmodified if no feature flags are set', () => {
    const anchorStr = createHrefComponent('https://abc.def');
    expect(anchorStr.attributes['href']).toBe('https://abc.def');
  });
});
