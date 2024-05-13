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
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
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
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {
  getColorGroupRegexString,
  getDashboardExperimentNames,
  getDarkModeEnabled,
  getRunIdsForExperiment,
  getRuns,
  getEnableColorByExperiment,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {buildColorPalette} from '../../../settings/testing';
import {KeyType, sendKey, SendKeyArgs} from '../../../testing/dom';
import {provideMockTbStore} from '../../../testing/utils';
import {runGroupByChanged} from '../../actions';
import {buildRun} from '../../store/testing';
import {GroupByKey} from '../../types';
import {RegexEditDialogComponent} from './regex_edit_dialog_component';
import {
  RegexEditDialogContainer,
  TEST_ONLY,
} from './regex_edit_dialog_container';
import {MatSelectModule} from '@angular/material/select';

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
        MatSelectModule,
      ],
      declarations: [RegexEditDialogComponent, RegexEditDialogContainer],
      providers: [
        provideMockTbStore(),
        {provide: MatDialogRef, useValue: matDialogRefSpy},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createComponent(experimentIds: string[]) {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {experimentIds},
    });

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getColorGroupRegexString, 'test regex string');
    store.overrideSelector(getRuns, []);
    store.overrideSelector(getRunIdsForExperiment, []);
    store.overrideSelector(getDarkModeEnabled, false);
    store.overrideSelector(
      settingsSelectors.getColorPalette,
      buildColorPalette()
    );
    store.overrideSelector(getDashboardExperimentNames, {
      rose: 'exp_name_rose',
    });
    store.overrideSelector(getEnableColorByExperiment, true);
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

  it('renders regexString populated from store', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));

    expect(input.nativeElement.value).toBe('test regex string');
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
        expNameByExpId: {rose: 'exp_name_rose'},
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
        expNameByExpId: {rose: 'exp_name_rose'},
        groupBy: {key: GroupByKey.REGEX, regexString: 'test'},
      })
    );
  });

  it('emits groupby experiment action if user chooses the dropdown and saves', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const matSelect = fixture.debugElement.query(By.css('mat-select'));
    matSelect.triggerEventHandler('selectionChange', {value: 'regex_by_exp'});

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

    expect(matSelect.nativeNode.textContent).toBe('Experiment Name');
    expect(dispatchSpy).toHaveBeenCalledWith(
      runGroupByChanged({
        experimentIds: ['rose'],
        expNameByExpId: {rose: 'exp_name_rose'},
        groupBy: {key: GroupByKey.REGEX_BY_EXP, regexString: 'test'},
      })
    );
  });

  it('show only one dropdown option if colorByExperiment flag is disabled', () => {
    const fixture = createComponent(['rose']);
    store.overrideSelector(getEnableColorByExperiment, false);
    fixture.detectChanges();

    const matSelect = fixture.debugElement.query(
      By.css('mat-select')
    ).nativeElement;
    matSelect.click();
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(By.css('mat-option'));
    expect(options.length).toBe(1);
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
        expNameByExpId: {rose: 'exp_name_rose'},
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
        expNameByExpId: {rose: 'exp_name_rose'},
        groupBy: {key: GroupByKey.REGEX, regexString: 'test regex string'},
      })
    );
  });

  it('fills example and generates warning', () => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('.example-details button')
    );
    button.nativeElement.click();
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.value).toBe('(train|eval)');
    const warning = fixture.debugElement.queryAll(By.css('.warning'));
    expect(warning).toBeTruthy();
  });

  it('fills example and generates group preview', fakeAsync(() => {
    const fixture = createComponent(['rose']);
    store.overrideSelector(getRuns, [
      buildRun({id: 'run1', name: 'run 1'}),
      buildRun({id: 'run2', name: 'run 2'}),
    ]);
    store.overrideSelector(getColorGroupRegexString, 'run');
    fixture.detectChanges();
    tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
    fixture.detectChanges();

    const button = fixture.debugElement.query(
      By.css('.example-details button')
    );
    button.nativeElement.click();
    fixture.detectChanges();

    const groupingResult = fixture.debugElement.query(
      By.css('.group-container')
    );
    expect(groupingResult).not.toBeNull();
    const groups = fixture.debugElement.queryAll(By.css('.group'));
    expect(groups.length).toBe(1);
    discardPeriodicTasks();
  }));

  describe('live grouping result preview', () => {
    it('renders grouping result based on regex in store', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getColorGroupRegexString, 'run');
      fixture.detectChanges();
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const groupingResult = fixture.debugElement.query(
        By.css('.group-container')
      );
      expect(groupingResult).not.toBeNull();
      const groups = fixture.debugElement.queryAll(By.css('.group'));
      expect(groups.length).toBe(1);
    }));

    it('renders grouping preview on regex query input', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      const keyArgs: SendKeyArgs = {
        key: '',
        prevString: 'run',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      };
      sendKey(fixture, input, keyArgs);
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const groupingResult = fixture.debugElement.query(
        By.css('.group-container')
      );
      expect(groupingResult).not.toBeNull();
      const text = fixture.debugElement.query(By.css('.group-container h4'));
      expect(text.nativeElement.textContent).toBe('Color group preview');
      const groups = fixture.debugElement.queryAll(By.css('.group'));
      expect(groups.length).toBe(1);
    }));

    it('renders multiple groups preview on regex query input', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run1 name'}),
        buildRun({id: 'run2', name: 'run2 name'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      const keyArgs: SendKeyArgs = {
        key: '',
        prevString: 'run(\\d+)',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      };
      sendKey(fixture, input, keyArgs);
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const groups = fixture.debugElement.queryAll(By.css('.group'));
      expect(groups.length).toBe(2);
    }));

    it('renders groupByRegexString on tentativeString after initialization', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      const keyArgs: SendKeyArgs = {
        key: '',
        prevString: 'run',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      };
      sendKey(fixture, input, keyArgs);
      fixture.detectChanges();

      store.overrideSelector(getColorGroupRegexString, 'string from store');
      store.refreshState();
      fixture.detectChanges();

      expect(input.nativeElement.value).not.toBe('string from store');
      discardPeriodicTasks();
    }));

    it('does not render grouping preview on empty regex query input', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      const keyArgs: SendKeyArgs = {
        key: '',
        prevString: '',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      };
      sendKey(fixture, input, keyArgs);
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const groupingResult = fixture.debugElement.query(
        By.css('.group-container')
      );
      expect(groupingResult).toBeNull();
    }));

    it('renders warning when no runs match', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      const keyArgs: SendKeyArgs = {
        key: '',
        prevString: 'test',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      };
      sendKey(fixture, input, keyArgs);
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const warning = fixture.debugElement.query(
        By.css('.group-container .warning')
      );
      expect(warning).not.toBeNull();
    }));

    it('does not update grouping preview on invalid regex input', fakeAsync(() => {
      const fixture = createComponent(['rose']);
      store.overrideSelector(getRuns, [
        buildRun({id: 'run1', name: 'run 1'}),
        buildRun({id: 'run2', name: 'run 2'}),
      ]);
      store.overrideSelector(getRunIdsForExperiment, ['run1', 'run2']);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));

      const keyArgs: SendKeyArgs = {
        key: '.',
        prevString: 'run',
        type: KeyType.CHARACTER,
        startingCursorIndex: 3,
      };
      sendKey(fixture, input, keyArgs);
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const groupingResult = fixture.debugElement.query(
        By.css('.group-container')
      );
      const beforeGroupContent = groupingResult.nativeElement.textContent;

      sendKey(fixture, input, {
        key: '.',
        prevString: 'train_(\\d',
        type: KeyType.CHARACTER,
        startingCursorIndex: 0,
      });
      tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
      fixture.detectChanges();

      const afterGroupContent = groupingResult.nativeElement.textContent;
      expect(beforeGroupContent).toBe(afterGroupContent);
    }));
  });

  it('renders `and X more` when the grouping result is more than 5', fakeAsync(() => {
    const fixture = createComponent(['rose']);
    store.overrideSelector(getRuns, [
      buildRun({id: 'run1', name: 'run1 name'}),
      buildRun({id: 'run2', name: 'run2 name'}),
      buildRun({id: 'run3', name: 'run3 name'}),
      buildRun({id: 'run4', name: 'run4 name'}),
      buildRun({id: 'run5', name: 'run5 name'}),
      buildRun({id: 'run6', name: 'run6 name'}),
      buildRun({id: 'run6', name: 'run7 name'}),
    ]);
    store.overrideSelector(getRunIdsForExperiment, [
      'run1',
      'run2',
      'run3',
      'run4',
      'run5',
      'run6',
      'run7',
    ]);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    const keyArgs: SendKeyArgs = {
      key: '',
      prevString: 'run',
      type: KeyType.CHARACTER,
      startingCursorIndex: 0,
    };
    sendKey(fixture, input, keyArgs);
    tick(TEST_ONLY.INPUT_CHANGE_DEBOUNCE_INTERVAL_MS);
    fixture.detectChanges();

    const more = fixture.debugElement.query(By.css('.more'));
    const list = fixture.debugElement.queryAll(By.css('.group ul li'));
    expect(list.length).toBe(6);
    expect(more.nativeElement.textContent).toBe('and 2 more');
  }));

  it('makes focus stay in the regex dialog', fakeAsync(() => {
    const fixture = createComponent(['rose']);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    // Works around for input element focus initial (cdkFocusInitial)
    input.nativeElement.focus();
    tick();

    const inputDummy = document.createElement('input');
    document.body.append(inputDummy);
    inputDummy.focus();
    tick();

    expect(document.activeElement).toBe(input.nativeElement);
    discardPeriodicTasks();
  }));
});
