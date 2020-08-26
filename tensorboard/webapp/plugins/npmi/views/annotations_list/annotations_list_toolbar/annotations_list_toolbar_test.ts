import {TestBed, ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {AnnotationsListToolbarComponent} from './annotations_list_toolbar_component';
import {AnnotationsListToolbarContainer} from './annotations_list_toolbar_container';
import * as npmiActions from '../../../actions';
import {SortingOrder} from '../../../store/npmi_types';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Annotations List Toolbar Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let fixture: ComponentFixture<AnnotationsListToolbarContainer>;
  const css = {
    TITLE: '.annotations-title',
    BUTTON: 'button',
    ICON: 'mat-icon',
  };

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

    fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.componentInstance.numAnnotations = 3;
    fixture.componentInstance.expanded = true;
    fixture.detectChanges();
  });

  fit('renders toolbar in expanded state with no annotations selected', () => {
    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('Annotations (3)');

    const buttons = fixture.debugElement.queryAll(By.css(css.BUTTON));
    expect(buttons.length).toBe(3);
    expect(buttons[0].nativeElement.disabled).toBeTrue();
    expect(buttons[1].nativeElement.disabled).toBeTrue();

    const expandedIcon = buttons[2].query(By.css(css.ICON));
    expect(expandedIcon.nativeElement.svgIcon).toBe('expand_less_24px');
  });

  // describe('interacting with toggles', () => {
  //   it('dispatches toggleExpanded when toggled', () => {
  //     const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
  //     const expandButton = fixture.debugElement.query(By.css('.expand-button'));
  //     expandButton.nativeElement.click();
  //     fixture.detectChanges();

  //     expect(dispatchedActions).toEqual([
  //       npmiActions.npmiToggleAnnotationsExpanded(),
  //     ]);

  //     const toolbarContainer = fixture.debugElement.query(
  //       By.css('.annotations-toolbar-top')
  //     );
  //     expect(toolbarContainer).toBeFalsy();
  //   });

  //   it('dispatches toggleExpanded when toggled', () => {
  //     const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
  //     const expandButton = fixture.debugElement.query(By.css('.expand-button'));
  //     expandButton.nativeElement.click();
  //     fixture.detectChanges();

  //     expect(dispatchedActions).toEqual([
  //       npmiActions.npmiToggleAnnotationsExpanded(),
  //     ]);

  //     const toolbarContainer = fixture.debugElement.query(
  //       By.css('.annotations-toolbar-top')
  //     );
  //     expect(toolbarContainer).toBeFalsy();
  //   });
  // });
});
