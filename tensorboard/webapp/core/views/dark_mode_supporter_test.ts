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
import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {getDarkModeEnabled} from '../../selectors';
import {provideMockTbStore} from '../../testing/utils';
import {DarkModeSupportContainer} from './dark_mode_supporter_container';

describe('dark mode supporter test', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [provideMockTbStore(), DarkModeSupportContainer],
      declarations: [DarkModeSupportContainer],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getDarkModeEnabled, false);
  });

  afterEach(() => {
    document.body.classList.remove('dark-mode');
    store?.resetSelectors();
  });

  it('sets class name on body when dark mode is enabled', () => {
    store.overrideSelector(getDarkModeEnabled, false);
    const fixture = TestBed.createComponent(DarkModeSupportContainer);
    fixture.detectChanges();
    expect(document.body.classList.contains('dark-mode')).toBe(false);

    store.overrideSelector(getDarkModeEnabled, true);
    store.refreshState();
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('removes class name on body when dark mode is disabled', () => {
    store.overrideSelector(getDarkModeEnabled, true);
    const fixture = TestBed.createComponent(DarkModeSupportContainer);
    fixture.detectChanges();
    expect(document.body.classList.contains('dark-mode')).toBe(true);

    store.overrideSelector(getDarkModeEnabled, false);
    store.refreshState();
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });
});
