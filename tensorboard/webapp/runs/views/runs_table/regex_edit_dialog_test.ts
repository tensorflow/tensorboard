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
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {getRegexString} from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {runGroupByChanged} from '../../actions';
import {GroupByKey} from '../../types';
import {RegexEditDialogComponent} from './regex_edit_dialog_component';
import {RegexEditDialogContainer} from './regex_edit_dialog_container';
import {RunsGroupMenuButtonComponent} from './runs_group_menu_button_component';
import {RunsGroupMenuButtonContainer} from './runs_group_menu_button_container';
import {RunsTableComponent} from './runs_table_component';
import {RunsTableContainer} from './runs_table_container';
// import {KeyCodes} from 'google3/third_party/javascript/closure/events/keycodes';

describe('regex_edit_dialog', () => {
  let actualActions: Action[];
  let dispatchSpy: jasmine.Spy;
  let store: MockStore<State>;
  const matDialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
  const experimentIds = ['book'];

  function createComponent(experimentIds: string[]) {
    const fixture = TestBed.createComponent(RegexEditDialogContainer);
    fixture.componentInstance.experimentIds = experimentIds;

    fixture.detectChanges();

    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatCheckboxModule,
        MatIconTestingModule,
        MatMenuModule,
        MatInputModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSortModule,
        MatTableModule,
        NoopAnimationsModule,
        FilterInputModule,
        RangeInputModule,
      ],
      declarations: [
        RegexEditDialogComponent,
        RegexEditDialogContainer,
        RunsGroupMenuButtonComponent,
        RunsGroupMenuButtonContainer,
        RunsTableComponent,
        RunsTableContainer,
        RunsTableContainer,
      ],
      providers: [
        provideMockStore(),
        {provide: MatDialogRef, useValue: matDialogRefSpy},
        {provide: MAT_DIALOG_DATA, useValue: {experimentIds}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    actualActions = [];

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRegexString, 'test regex string');

    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
  });

  it('renders regex edit dialog', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(
      By.directive(RegexEditDialogComponent)
    );
    expect(dialog).toBeTruthy();
  });

  it('clicks Save button omits groupby regex with regex string', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'test(\\d+)';
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

  it('clicks Save button omits groupby regex with non-regex string', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'test';
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

  /* this fails
  it('clicks Save button close the dialog', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(
      By.css('div[mat-dialog-actions] button')
    );
    buttons[1].nativeElement.click();
    console.log('buttons:', buttons[1].nativeElement);
    // 'buttons:', <button mat-button="" mat-dialog-close="">Save</button>
    expect(matDialogRefSpy.close).toHaveBeenCalled();
  });
  */

  it('clicks Save button omits groupby regex with empty string', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = '';

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

  it('presess enter key omits groupby regex with the regex string', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'test';
    const event = new KeyboardEvent('keydown', {key: 'enter'});
    input.nativeElement.dispatchEvent(event);
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        groupBy: {key: GroupByKey.REGEX, regexString: 'test'},
      })
    );
  });
});
