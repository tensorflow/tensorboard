import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../app_state';
import {getRunSelection} from './../../../../core/store/core_selectors';
import {getAnnotationsExpanded, getAnnotationData} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {createState, createCoreState} from '../../../../core/testing';
import {AnnotationsListComponent} from './annotations_list_component';
import {AnnotationsListContainer} from './annotations_list_container';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Annotations List Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsListComponent, AnnotationsListContainer],
      imports: [],
      providers: [
        provideMockStore({
          initialState: {
            ...createState(createCoreState()),
            ...appStateFromNpmiState(createNpmiState()),
          },
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  it('renders expanded annotations list', () => {
    const fixture = TestBed.createComponent(AnnotationsListContainer);
    fixture.detectChanges();

    const annotationsContainer = fixture.debugElement.query(
      By.css('.annotations-container')
    );
    expect(annotationsContainer).toBeTruthy();

    const notExpandedToolbar = fixture.debugElement.query(
      By.css('.annotations-toolbar-not-expanded')
    );
    expect(notExpandedToolbar).toBeFalsy();
  });

  it('renders non-expanded annotations list', () => {
    store.overrideSelector(getAnnotationsExpanded, false);
    store.overrideSelector(getAnnotationData, {
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
    });
    store.overrideSelector(getRunSelection, new Map([['test', true]]));

    const fixture = TestBed.createComponent(AnnotationsListContainer);
    fixture.detectChanges();

    const annotationsContainer = fixture.debugElement.query(
      By.css('.annotations-container')
    );
    expect(annotationsContainer).toBeFalsy();

    const notExpandedToolbar = fixture.debugElement.query(
      By.css('.annotations-toolbar-not-expanded')
    );
    expect(notExpandedToolbar).toBeTruthy();

    const annotationsTitle = fixture.debugElement.query(
      By.css('.annotations-title')
    );
    expect(annotationsTitle.nativeElement.textContent.trim()).toBe(
      'Annotations (2)'
    );
  });
});
