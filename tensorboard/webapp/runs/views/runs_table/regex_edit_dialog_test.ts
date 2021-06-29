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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';

import {State} from '../../../app_state';
import {getColorGroupRegexString} from '../../../selectors';
import {KeyType, sendKey, SendKeyArgs} from '../../../testing/dom';
import {runGroupByChanged} from '../../actions';
import {GroupByKey} from '../../types';
import {RegexEditDialogComponent} from './regex_edit_dialog_component';
import {RegexEditDialogContainer} from './regex_edit_dialog_container';

describe('regex_edit_dialog', () => {
  let actualActions: Action[];
  let dispatchSpy: jasmine.Spy;
  let store: MockStore<State>;
  const matDialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatMenuModule,
        MatInputModule,
        MatDialogModule,
        NoopAnimationsModule,
      ],
      declarations: [RegexEditDialogComponent, RegexEditDialogContainer],
      providers: [
        provideMockStore(),
        {provide: MatDialogRef, useValue: matDialogRefSpy},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(experimentIds: string[]) {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {useValue: {experimentIds}});

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getColorGroupRegexString, 'test regex string');
    actualActions = [];
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });

    return TestBed.createComponent(RegexEditDialogContainer);
  }

  it('renders regex edit dialog', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(
      By.directive(RegexEditDialogComponent)
    );
    expect(dialog).toBeTruthy();
  });

  it('emits groupby action with regexString when clicking on save button', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: 'test(\\d+)',
      prevString: '',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);
    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[1].nativeElement.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: 'test(\\d+)'},
      })
    );
  });

  it('emits groupby action with non regexString when clicking on save button', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: 'test',
      prevString: '',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);
    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[1].nativeElement.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: 'test'},
      })
    );
  });

  it('emits groupby action with empty string when clicking on save button', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: '',
      prevString: '',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);

    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[1].nativeElement.click();

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: ''},
      })
    );
  });

  it('closes the dialog when clicking on cancel button ', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[0].nativeElement.click();

    expect(matDialogRefSpy.close).toHaveBeenCalled();
  });

  it('does not emits groupby action when clicking on cancel button', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: 'test',
      prevString: '',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);
    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[0].nativeElement.click();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('closes the dialog when clicking on save button ', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[1].nativeElement.click();
    expect(matDialogRefSpy.close).toHaveBeenCalled();
  });

  it('emits groupby action with regex string when pressing enter key ', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: 'Enter',
      prevString: 'test',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: 'test'},
      })
    );
  });

  it('closes the dialog when pressing enter key', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: 'Enter',
      prevString: 'test regex string',
      type: KeyType.SPECIAL,
      startingCursorIndex: 10,
    };
    sendKey(fixture, input, keyArgs);

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: 'test regex string'},
      })
    );
  });
});
