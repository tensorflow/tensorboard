/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {Component, DebugElement, Input} from '@angular/core';
import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';

import {provideMockTbStore} from '../../testing/utils';
import {FEATURE_FLAGS_HEADER_NAME} from '../http/const';
import {getFeatureFlagsToSendToServer} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';

import {FeatureFlagDirective} from './feature_flag_directive';

@Component({
  standalone: false,
  selector: 'test-matching-selector',
  template: `
    <p>
      <a [href]="href" [includeFeatureFlags]>test link</a>
      <img [src]="src" [includeFeatureFlags] />
    </p>
  `,
})
export class TestMatchingComponent {
  @Input() href!: string;
  @Input() src!: string;
}

@Component({
  standalone: false,
  selector: 'test-nonmatching-selector',
  template: `
    <p>
      <img [src]="src" />
    </p>
  `,
})
export class TestNonmatchingComponent {
  @Input() src!: string;
}

describe('feature_flags', () => {
  let store: MockStore<FeatureFlagState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideMockTbStore()],
      declarations: [
        TestMatchingComponent,
        TestNonmatchingComponent,
        FeatureFlagDirective,
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

  function createMatchingHrefComponent(href: string): DebugElement {
    const fixture = TestBed.createComponent(TestMatchingComponent);
    fixture.componentInstance.href = href;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('a'));
  }

  function createMatchingImgComponent(src: string): DebugElement {
    const fixture = TestBed.createComponent(TestMatchingComponent);
    fixture.componentInstance.src = src;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('img'));
  }

  function createNonmatchingImgComponent(src: string): DebugElement {
    const fixture = TestBed.createComponent(TestNonmatchingComponent);
    fixture.componentInstance.src = src;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('img'));
  }

  it('injects feature flags in <img> tags if any are set without preexisting query parameters', fakeAsync(() => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createMatchingImgComponent('https://abc.def');
    expect(anchorStr.attributes['src']).toBe(
      'https://abc.def?tensorBoardFeatureFlags=%7B%22inColab%22%3Atrue%7D'
    );
  }));

  it('injects feature flags in <img> tags if any are set with preexisting query parameters', fakeAsync(() => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createMatchingImgComponent('https://abc.def?test=value');
    expect(anchorStr.attributes['src']).toBe(
      'https://abc.def?test=value&tensorBoardFeatureFlags=%7B%22inColab%22%3Atrue%7D'
    );
  }));

  it('leaves <img> tags unmodified if no feature flags are set', fakeAsync(() => {
    const anchorStr = createMatchingImgComponent('https://abc.def');
    expect(anchorStr.attributes['src']).toBe('https://abc.def');
  }));

  it('leaves <img> tags unmodified if [includeFeatureFlags] is not included', fakeAsync(() => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createNonmatchingImgComponent(
      'https://abc.def?test=value'
    );
    expect(anchorStr.attributes['src']).toBe('https://abc.def?test=value');
  }));

  it('injects feature flags in <a> tags if any are set', fakeAsync(() => {
    store.overrideSelector(getFeatureFlagsToSendToServer, {inColab: true});
    const anchorStr = createMatchingHrefComponent('https://abc.def');
    expect(anchorStr.attributes['href']).toBe(
      'https://abc.def?tensorBoardFeatureFlags=%7B%22inColab%22%3Atrue%7D'
    );
  }));
});
