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
import {DOCUMENT} from '@angular/common';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {reload} from '../core/actions';
import {
  createSettings,
  createSettingsState,
  createState,
} from '../settings/testing';
import {ReloaderComponent} from './reloader_component';

describe('reloader_component', () => {
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;
  let fakeDocument: Document;

  function createFakeDocument() {
    return {
      visibilityState: 'visible',
      addEventListener: document.addEventListener.bind(document),
      removeEventListener: document.removeEventListener.bind(document),
      // DOMTestComponentRenderer injects DOCUMENT and requires the following
      // properties to function.
      querySelectorAll: document.querySelectorAll.bind(document),
      body: document.body,
    };
  }

  function simulateVisibilityChange(visible: boolean) {
    Object.defineProperty(fakeDocument, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useFactory: createFakeDocument,
        },
        provideMockStore({
          initialState: createState(
            createSettingsState({
              settings: createSettings({
                reloadPeriodInMs: 5,
                reloadEnabled: true,
              }),
            })
          ),
        }),
        ReloaderComponent,
      ],
      declarations: [ReloaderComponent],
    }).compileComponents();
    store = TestBed.inject<Store>(Store) as MockStore;
    fakeDocument = TestBed.inject(DOCUMENT);
    dispatchSpy = spyOn(store, 'dispatch');
  });

  it('dispatches reload action every reload period', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalled();

    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(reload());

    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenCalledWith(reload());

    // Manually invoke destruction of the component so we can cleanup the
    // timer.
    fixture.destroy();
  }));

  it('disables reload when it is not enabled', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: false,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(10);

    expect(dispatchSpy).not.toHaveBeenCalled();

    fixture.destroy();
  }));

  it('respects reload period', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 50,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    expect(dispatchSpy).not.toHaveBeenCalled();

    tick(5);
    expect(dispatchSpy).not.toHaveBeenCalled();

    tick(45);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(reload());

    fixture.destroy();
  }));

  it('only resets timer when store values changes', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(4);
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    expect(dispatchSpy).not.toHaveBeenCalled();

    tick(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    tick(4);
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 3,
            reloadEnabled: true,
          }),
        })
      )
    );

    tick(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    tick(2);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);

    fixture.destroy();
  }));

  it('ignores store value changes after destroy', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 0,
            reloadEnabled: false,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    // Destroy the component.
    fixture.destroy();

    // Enable auto reload after the component has been destroyed.
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );

    // Advance clock to trigger auto reload.
    tick(5);
    // But reload should not have been triggered.
    expect(dispatchSpy).toHaveBeenCalledTimes(0);
  }));

  it('does not reload if document is not visible', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    simulateVisibilityChange(false);
    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();
  }));

  it('reloads when document becomes visible if missed reload', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    // Miss a reload because not visible.
    simulateVisibilityChange(false);
    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(0);

    // Dispatch a reload when next visible.
    simulateVisibilityChange(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();
  }));

  it('reloads when document becomes visible if missed reload, regardless of how long not visible', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Document is not visible during time period that includes missed auto
    // reload but is less than reloadPeriodInMs.
    tick(2);
    simulateVisibilityChange(false);
    tick(3);
    // No reload is dispatched.
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Dispatch a reload when next visible.
    simulateVisibilityChange(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);

    fixture.destroy();
  }));

  it('does not reload when document becomes visible if there was not a missed reload', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(5);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Document is not visible during time period that does not include
    // missed auto reload.
    simulateVisibilityChange(false);
    tick(3);
    simulateVisibilityChange(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();
  }));

  it('does not reload when document becomes visible if missed reload was already handled', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: true,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    // Miss a reload because not visible.
    simulateVisibilityChange(false);
    tick(6);
    expect(dispatchSpy).toHaveBeenCalledTimes(0);

    // Dispatch a reload when next visible.
    simulateVisibilityChange(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Document is not visible during time period that does not include
    // another missed reload.
    simulateVisibilityChange(false);
    tick(2);
    simulateVisibilityChange(true);
    // No additional reload dispatched.
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();
  }));

  it('does not reload when document becomes visible if auto reload is off', fakeAsync(() => {
    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 5,
            reloadEnabled: false,
          }),
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    simulateVisibilityChange(false);
    tick(5);

    simulateVisibilityChange(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(0);

    fixture.destroy();
  }));
});
