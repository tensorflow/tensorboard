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
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
} from '@angular/core/testing';
import {ColumnSelectorComponent} from './column_selector_component';
import {ColumnHeader, ColumnHeaderType} from './types';
import {FormsModule} from '@angular/forms';
import {By} from '@angular/platform-browser';

describe('column selector', () => {
  let fixture: ComponentFixture<ColumnSelectorComponent>;
  function renderComponent(props: {selectableColumns: ColumnHeader[]}) {
    const fixture = TestBed.createComponent(ColumnSelectorComponent);
    if (props.selectableColumns) {
      fixture.componentInstance.selectableColumns = props.selectableColumns;
    }
    fixture.componentInstance.activate();

    fixture.detectChanges();

    return fixture;
  }

  function getSelectedButton() {
    return fixture.debugElement.query(By.css('button.selected'));
  }

  function getLoadAllColumnsButton() {
    return fixture.debugElement.query(By.css('.column-load-info button'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColumnSelectorComponent],
      imports: [FormsModule],
    }).compileComponents();

    fixture = renderComponent({
      selectableColumns: [
        {
          type: ColumnHeaderType.RUN,
          name: 'runs',
          displayName: 'Runs',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'lr',
          displayName: 'Learning Rate',
          enabled: true,
        },
      ],
    });
  });

  describe('keyboard navigation', () => {
    it('decreases selected index when the up arrow is pressed', () => {
      fixture.componentInstance.selectedIndex$.next(1);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );

      const event = new KeyboardEvent('keydown', {key: 'arrowup'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
    });

    it('does not change selected index on up arrow press when deactivated', () => {
      fixture.componentInstance.selectedIndex$.next(1);
      fixture.componentInstance.deactivate();
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );

      const event = new KeyboardEvent('keydown', {key: 'arrowup'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });

    it('increases selected index when the down arrow is pressed', () => {
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
      const event = new KeyboardEvent('keydown', {key: 'arrowdown'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });

    it('does not change selected index when the down arrow is pressed while deactivated', () => {
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
      fixture.componentInstance.deactivate();
      const event = new KeyboardEvent('keydown', {key: 'arrowdown'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
    });

    it('does not change index when columns are selected', () => {
      fixture.componentInstance.selectedIndex$.next(1);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );

      fixture.componentInstance.searchInputChanged();
      fixture.detectChanges();

      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });

    it('selects a column when the enter key is pressed', fakeAsync(() => {
      let selectedColumn: ColumnHeader;
      fixture.componentInstance.columnSelected.subscribe((column) => {
        selectedColumn = column;
      });

      const event = new KeyboardEvent('keydown', {key: 'enter'});
      document.dispatchEvent(event);
      flush();
      expect(selectedColumn!.name).toEqual('runs');
    }));

    it('does not select a column when the enter key is pressed while deactivated', fakeAsync(() => {
      fixture.componentInstance.columnSelected.subscribe(() => {
        fail('should not be called');
      });
      fixture.componentInstance.deactivate();

      const event = new KeyboardEvent('keydown', {key: 'enter'});
      document.dispatchEvent(event);
      flush();
    }));

    it('cannot select indexes below 0', () => {
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
      const event = new KeyboardEvent('keydown', {key: 'arrowup'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual('Runs');
    });

    it('cannot select indexes greater than the number of selectable columns', () => {
      fixture.componentInstance.selectedIndex$.next(1);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
      const event = new KeyboardEvent('keydown', {key: 'arrowdown'});
      document.dispatchEvent(event);
      fixture.detectChanges();
      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });
  });

  describe('search bar', () => {
    it('filters columns by displayName', () => {
      fixture.componentInstance.searchInput = 'Learning Rate';
      fixture.componentInstance.searchInputChanged();
      fixture.detectChanges();

      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });

    it('filters columns by name', () => {
      fixture.componentInstance.searchInput = 'lr';
      fixture.componentInstance.searchInputChanged();
      fixture.detectChanges();

      expect(getSelectedButton().nativeElement.innerText).toEqual(
        'Learning Rate'
      );
    });
  });

  it('selects a column when it is clicked', fakeAsync(() => {
    let selectedColumn: ColumnHeader;
    fixture.componentInstance.columnSelected.subscribe((column) => {
      selectedColumn = column;
    });
    getSelectedButton().nativeElement.click();
    flush();

    expect(selectedColumn!.name).toEqual('runs');
  }));

  it('renders tags', () => {
    fixture.componentInstance.selectableColumns = [
      {
        type: ColumnHeaderType.HPARAM,
        name: 'lr',
        displayName: 'Learning Rate',
        enabled: true,
        tags: ['tag1', 'tag2'],
      },
    ];
    fixture.detectChanges();

    const tagEls = fixture.debugElement.queryAll(By.css('.tag'));
    expect(tagEls.length).toEqual(2);
    expect(tagEls[0].nativeElement.textContent.trim()).toEqual('tag1');
    expect(tagEls[1].nativeElement.textContent.trim()).toEqual('tag2');
  });

  it('renders number of loaded columns', fakeAsync(() => {
    fixture.componentInstance.numColumnsLoaded = 100;
    fixture.detectChanges();

    const numColumns = fixture.debugElement.query(By.css('.column-load-info'));
    expect(numColumns.nativeElement.textContent).toEqual('100 columns loaded.');
  }));

  it('renders too many columns warning', fakeAsync(() => {
    fixture.componentInstance.hasMoreColumnsToLoad = true;
    fixture.detectChanges();

    const numColumnsEl = fixture.debugElement.query(
      By.css('.column-load-info')
    );
    expect(numColumnsEl.nativeElement.textContent).toContain(
      'Warning: There were too many columns to load all of them efficiently.'
    );
  }));

  it('does not render "load all" button by default', fakeAsync(() => {
    const loadAllButton = getLoadAllColumnsButton();
    expect(loadAllButton).toBeFalsy();
  }));

  it('renders "load all" button and responds to click', fakeAsync(() => {
    let loadAllColumnsClicked = false;
    fixture.componentInstance.loadAllColumns.subscribe(() => {
      loadAllColumnsClicked = true;
    });
    fixture.componentInstance.hasMoreColumnsToLoad = true;
    fixture.detectChanges();

    const loadAllButton = getLoadAllColumnsButton();
    loadAllButton.nativeElement.click();
    flush();

    expect(loadAllColumnsClicked).toBeTrue();
  }));
});
