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

  it('selects a column when the it is clicked', fakeAsync(() => {
    let selectedColumn: ColumnHeader;
    fixture.componentInstance.columnSelected.subscribe((column) => {
      selectedColumn = column;
    });
    getSelectedButton().nativeElement.click();
    flush();

    expect(selectedColumn!.name).toEqual('runs');
  }));
});
