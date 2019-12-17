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
import {TestBed, tick, fakeAsync} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {SettingsDialogComponent} from './dialog_component';

import {toggleReloadEnabled, changeReloadPeriod} from '../core/actions';
import {State} from '../core/store';
import {createCoreState, createState} from '../core/testing';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('settings dialog test', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              reloadPeriodInMs: 30000,
              reloadEnabled: true,
            })
          ),
        }),
        SettingsDialogComponent,
      ],
      declarations: [SettingsDialogComponent],
    }).compileComponents();
    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch');
  });

  it('renders settings', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    fixture.detectChanges();

    const checkbox = fixture.debugElement.query(By.css('mat-checkbox'));
    expect(checkbox.classes['mat-checkbox-checked']).toBe(true);

    const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('30');
  });

  it('updates the UI according to store changes.', () => {
    const fixture = TestBed.createComponent(SettingsDialogComponent);
    fixture.detectChanges();

    // sanity to make sure it really did change.
    const checkbox = fixture.debugElement.query(By.css('mat-checkbox'));
    expect(checkbox.classes['mat-checkbox-checked']).toBe(true);

    store.setState(
      createState(
        createCoreState({
          reloadPeriodInMs: 60000,
          reloadEnabled: false,
        })
      )
    );
    fixture.detectChanges();

    expect(checkbox.classes['mat-checkbox-checked']).toBe(false);

    const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('60');
  });

  describe('toggleReloadEnabled', () => {
    it('dispatches when clicking on checkbox', fakeAsync(() => {
      const fixture = TestBed.createComponent(SettingsDialogComponent);
      fixture.detectChanges();

      const checkbox = fixture.debugElement.query(By.css('mat-checkbox input'));
      checkbox.nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(toggleReloadEnabled());
    }));
  });

  describe('changeReloadPeriod', () => {
    it('dispatches changing the value', fakeAsync(async () => {
      const fixture = TestBed.createComponent(SettingsDialogComponent);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 20;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      expect(dispatchSpy).not.toHaveBeenCalled();

      // We debounce it so it does not spam other components on very keystroke.
      tick(500);

      expect(dispatchSpy).toHaveBeenCalledWith(
        changeReloadPeriod({periodInMs: 20000})
      );
    }));

    it('does not dispatch when input is invalid', fakeAsync(async () => {
      const fixture = TestBed.createComponent(SettingsDialogComponent);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 5;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      tick(1e10);

      expect(dispatchSpy).not.toHaveBeenCalled();
    }));

    it('does not set state when reload is disabled', fakeAsync(() => {
      store.setState(
        createState(
          createCoreState({
            reloadPeriodInMs: 30000,
            reloadEnabled: false,
          })
        )
      );
      const fixture = TestBed.createComponent(SettingsDialogComponent);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 30;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      tick(1e10);

      expect(dispatchSpy).not.toHaveBeenCalled();
    }));
  });
});
