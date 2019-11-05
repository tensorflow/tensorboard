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
import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {ReloaderComponent} from './reloader.component';

import {reload} from '../core/core.actions';
import {
  State,
  CoreState,
  getReloadEnabled,
  getReloadPeriodInMs,
} from '../core/core.reducers';
import {
  createPluginMetadata,
  createState,
  createCoreState,
} from '../core/testing';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('reloader.component', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              reloadPeriodInMs: 5,
              reloadEnabled: true,
            })
          ),
        }),
        ReloaderComponent,
      ],
      declarations: [ReloaderComponent],
    }).compileComponents();
    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch');
  });

  it('dispatches reload action every reload period', fakeAsync(() => {
    store.setState(
      createState(
        createCoreState({
          reloadPeriodInMs: 5,
          reloadEnabled: true,
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

    // // Manually invoke destruction of the component so we can cleanup the timer.
    fixture.destroy();
  }));

  it('disables reload when it is not enabled', fakeAsync(() => {
    store.setState(
      createState(
        createCoreState({
          reloadPeriodInMs: 5,
          reloadEnabled: false,
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
        createCoreState({
          reloadPeriodInMs: 50,
          reloadEnabled: true,
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
        createCoreState({
          reloadPeriodInMs: 5,
          reloadEnabled: true,
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();

    tick(4);
    store.setState(
      createState(
        createCoreState({
          reloadPeriodInMs: 5,
          reloadEnabled: true,
        })
      )
    );
    fixture.detectChanges();
    expect(dispatchSpy).not.toHaveBeenCalled();

    tick(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    tick(4);
    store.setState(
      createState(
        createCoreState({
          reloadPeriodInMs: 3,
          reloadEnabled: true,
        })
      )
    );

    tick(1);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    tick(2);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);

    fixture.destroy();
  }));
});
