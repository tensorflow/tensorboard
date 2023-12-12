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
import {TestBed} from '@angular/core/testing';
import {HashStorageComponent} from './hash';

describe('hash storage test', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;
  let setStringSpy: jasmine.Spy;
  let getStringSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CommonModule],
      providers: [provideMockStore(), HashStorageContainer],
      declarations: [HashStorageContainer, HashStorageComponent],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');

    setStringSpy = jasmine.createSpy();
    getStringSpy = jasmine.createSpy();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('sets the hash to plugin id by replacing on first load', () => {
    store.overrideSelector(getActivePlugin, 'foo');
    const fixture = TestBed.createComponent(HashStorageContainer);
    fixture.detectChanges();

    expect(setStringSpy).toHaveBeenCalledWith(jasmine.any(String), 'foo', {
      useLocationReplace: true,
    });
  });

  it('changes hash with new pluginId on subsequent changes', () => {
    store.overrideSelector(getActivePlugin, 'foo');
    const fixture = TestBed.createComponent(HashStorageContainer);
    fixture.detectChanges();
    getStringSpy.and.returnValue('foo');

    store.overrideSelector(getActivePlugin, 'bar');
    store.refreshState();
    fixture.detectChanges();

    expect(setStringSpy).toHaveBeenCalledTimes(2);
    expect(setStringSpy).toHaveBeenCalledWith(jasmine.any(String), 'bar', {});
  });

  it('dispatches plugin changed event when hash changes', () => {
    store.overrideSelector(getActivePlugin, 'foo');
    const fixture = TestBed.createComponent(HashStorageContainer);
    fixture.detectChanges();
    getStringSpy.and.returnValue('bar');

    window.dispatchEvent(new Event('hashchange'));
    expect(dispatchSpy).toHaveBeenCalledWith(
      pluginUrlHashChanged({plugin: 'bar'})
    );
  });
});
