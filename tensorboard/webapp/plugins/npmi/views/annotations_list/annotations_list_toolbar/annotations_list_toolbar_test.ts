import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {AnnotationsListToolbarComponent} from './annotations_list_toolbar_component';
import {AnnotationsListToolbarContainer} from './annotations_list_toolbar_container';
import * as npmiActions from '../../../actions';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';
import {SortingOrder} from '../../../store/npmi_types';

describe('Npmi Annotations List Toolbar Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AnnotationsListToolbarComponent,
        AnnotationsListToolbarContainer,
      ],
      imports: [],
      providers: [provideMockStore({})],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  it('renders toolbar, heading, and legend', () => {
    const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.componentInstance.numAnnotations = 3;
    fixture.detectChanges();

    const toolbarContainer = fixture.debugElement.query(
      By.css('.annotations-toolbar-top')
    );
    expect(toolbarContainer).toBeTruthy();

    const toolbarBottom = fixture.debugElement.query(
      By.css('.annotations-toolbar-bottom')
    );
    expect(toolbarBottom).toBeTruthy();

    const title = fixture.debugElement.query(By.css('.annotations-title'));
    expect(title.nativeElement.textContent.trim()).toBe('Annotations (3)');
  });

  describe('interacting with toggles', () => {
    it('dispatches toggleExpanded when toggled', () => {
      const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
      const expandButton = fixture.debugElement.query(By.css('.expand-button'));
      expandButton.nativeElement.click();
      fixture.detectChanges();

      expect(dispatchedActions).toEqual([
        npmiActions.npmiToggleAnnotationsExpanded(),
      ]);

      const toolbarContainer = fixture.debugElement.query(
        By.css('.annotations-toolbar-top')
      );
      expect(toolbarContainer).toBeFalsy();
    });
  });
});
