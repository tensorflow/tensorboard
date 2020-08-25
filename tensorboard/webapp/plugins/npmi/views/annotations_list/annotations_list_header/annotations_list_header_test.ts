import {TestBed, ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {AnnotationsListHeaderComponent} from './annotations_list_header_component';
import {AnnotationsListHeaderContainer} from './annotations_list_header_container';
import * as npmiActions from '../../../actions';
import {SortingOrder} from '../../../store/npmi_types';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';
import {getAnnotationSorting} from '../../../store';

describe('Npmi Annotations List Header Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let fixture: ComponentFixture<AnnotationsListHeaderContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AnnotationsListHeaderComponent,
        AnnotationsListHeaderContainer,
      ],
      imports: [],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    fixture = TestBed.createComponent(AnnotationsListHeaderContainer);
    fixture.componentInstance.activeMetrics = [
      'nPMI@test',
      'nPMI@test2',
      'nPMI_diff@(test-test2)',
    ];
    fixture.componentInstance.numAnnotations = 3;
    fixture.componentInstance.annotations = {
      annotation_1: [
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'test',
          nPMIValue: 1.0,
          countValue: 100,
        },
      ],
      annotation_2: [
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'test',
          nPMIValue: 1.0,
          countValue: 100,
        },
      ],
    };
    fixture.detectChanges();
  });

  it('renders checkbox and container', () => {
    const strippedMetrics = ['test', 'test2', '(test-test2)'];

    const checkboxContainer = fixture.debugElement.query(
      By.css('.checkbox-container')
    );
    expect(checkboxContainer).toBeTruthy();

    const checkbox = fixture.debugElement.query(By.css('mat-checkbox'));
    expect(checkbox.nativeElement.checked).toBeFalsy();

    const headerContainer = fixture.debugElement.query(
      By.css('.annotations-header-container')
    );
    expect(headerContainer).toBeTruthy();

    const headerMetrics = fixture.debugElement.queryAll(
      By.css('.header-clickable')
    );
    for (const index in strippedMetrics) {
      expect(headerMetrics[index].nativeElement.textContent.trim()).toBe(
        strippedMetrics[index]
      );
    }
  });

  it('renders sorting arrow when sorting active', () => {
    store.overrideSelector(getAnnotationSorting, {
      metric: 'nPMI@test',
      order: SortingOrder.DOWN,
    });
    fixture = TestBed.createComponent(AnnotationsListHeaderContainer);
    fixture.componentInstance.activeMetrics = [
      'nPMI@test',
      'nPMI@test2',
      'nPMI_diff@(test-test2)',
    ];
    fixture.detectChanges();
    const headerMetric = fixture.debugElement.query(
      By.css('.header-clickable')
    );
    expect(headerMetric.nativeElement.textContent.trim()).toBe(
      'test \uD83E\uDC27'
    );
  });

  it('dispatches toggleAllAnnotations action when checkbox is clicked', () => {
    const checkbox = fixture.debugElement.query(By.css('mat-checkbox input'));
    checkbox.nativeElement.click();
    fixture.detectChanges();
    expect(dispatchedActions).toEqual([
      npmiActions.npmiSetSelectedAnnotations({
        annotations: ['annotation_1', 'annotation_2'],
      }),
    ]);
    expect(checkbox.nativeElement.checked).toBeTruthy();
  });

  it('dispatches sortingChanged action when metric is clicked', () => {
    const headerMetric = fixture.debugElement.query(
      By.css('.header-clickable')
    );
    headerMetric.nativeElement.click();
    fixture.detectChanges();
    expect(dispatchedActions).toEqual([
      npmiActions.npmiChangeAnnotationSorting({
        sorting: {
          metric: 'nPMI@test',
          order: SortingOrder.DOWN,
        },
      }),
    ]);
  });
});
