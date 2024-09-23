/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {provideMockTbStore} from '../../testing/utils';
import {MouseEventButtons} from '../../util/dom';
import {sideBarWidthChanged} from '../actions';
import {State} from '../state';
import {
  getRunsTableFullScreen,
  getSideBarWidthInPercent,
} from '../store/core_selectors';
import {LayoutContainer} from './layout_container';

@Component({
  standalone: false,
  selector: 'sidebar',
  template: `sidebar content`,
})
class Sidebar {}

@Component({
  standalone: false,
  selector: 'main',
  template: `main content`,
})
class Main {}

@Component({
  standalone: false,
  selector: 'testable-component',
  template: `
    <tb-dashboard-layout>
      <sidebar sidebar></sidebar>
      <main main></main>
    </tb-dashboard-layout>
  `,
  styles: [
    `
      :host,
      tb-dashboard-layout {
        height: 1000px;
        position: fixed;
        width: 1000px;
      }
    `,
  ],
})
class TestableComponent {}

describe('layout test', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[] = [];

  const byCss = {
    EXPANDER: By.css('.expand-collapsed-sidebar'),
    RESIZER: By.css('.resizer'),
    SIDEBAR_CONTAINER: By.css('nav'),
    LAYOUT: By.directive(LayoutContainer),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatIconTestingModule],
      declarations: [TestableComponent, Main, Sidebar, LayoutContainer],
      providers: [provideMockTbStore()],
    }).compileComponents();

    dispatchedActions = [];
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    store.overrideSelector(getSideBarWidthInPercent, 10);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders sidebar and main content', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.nativeElement.textContent).toContain(
      'sidebar content'
    );
    expect(fixture.debugElement.nativeElement.textContent).toContain(
      'main content'
    );
  });

  it('does not render sidebar when the width is 0', () => {
    store.overrideSelector(getSideBarWidthInPercent, 0);
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(byCss.SIDEBAR_CONTAINER)).toBeNull();
  });

  it('renders expander when sidebar is collapsed', () => {
    store.overrideSelector(getSideBarWidthInPercent, 0);
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(byCss.EXPANDER)).not.toBeNull();

    store.overrideSelector(getSideBarWidthInPercent, 10);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.debugElement.query(byCss.EXPANDER)).toBeNull();
  });

  it('sets width style on the sidebar', () => {
    store.overrideSelector(getSideBarWidthInPercent, 13);
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    const navEl = fixture.debugElement.query(byCss.SIDEBAR_CONTAINER);
    expect(navEl.styles['width']).toBe('13%');

    store.overrideSelector(getSideBarWidthInPercent, 70);
    store.refreshState();
    fixture.detectChanges();
    expect(navEl.styles['width']).toBe('70%');
  });

  it('overrides max width when the runs table full screen is true', () => {
    store.overrideSelector(getRunsTableFullScreen, true);
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();

    const navEl = fixture.debugElement.query(byCss.SIDEBAR_CONTAINER);
    expect(navEl.styles['width']).toBe('100%');
  });

  describe('interactions', () => {
    function triggerMouseMove(
      fixture: ComponentFixture<TestableComponent>,
      clientX: number,
      buttons = MouseEventButtons.LEFT
    ) {
      fixture.debugElement.query(byCss.LAYOUT).nativeElement.dispatchEvent(
        new MouseEvent('mousemove', {
          buttons,
          clientX,
        })
      );
    }

    function triggerMouseUp(fixture: ComponentFixture<TestableComponent>) {
      fixture.debugElement
        .query(byCss.LAYOUT)
        .nativeElement.dispatchEvent(new MouseEvent('mouseup'));
    }

    function mouseDownOnResizer(fixture: ComponentFixture<TestableComponent>) {
      fixture.debugElement
        .query(byCss.RESIZER)
        .triggerEventHandler('mousedown', {});
    }

    it('dispatches action when moving mouse while pressing LEFT down', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      mouseDownOnResizer(fixture);
      triggerMouseMove(fixture, 1000);

      triggerMouseMove(fixture, 200);
      triggerMouseMove(fixture, 100);

      expect(dispatchedActions).toEqual([
        sideBarWidthChanged({widthInPercent: 100}),
        sideBarWidthChanged({widthInPercent: 20}),
        sideBarWidthChanged({widthInPercent: 10}),
      ]);
    });

    it('does not react when movemove-ing without mousedown on resizer first', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      triggerMouseMove(fixture, 1000);
      triggerMouseMove(fixture, 100);
      expect(dispatchedActions).toEqual([]);
    });

    it('ignores mousemove when not pressing on LEFT mouse key', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      mouseDownOnResizer(fixture);
      triggerMouseMove(fixture, 1000);

      triggerMouseMove(fixture, 200, MouseEventButtons.MIDDLE);
      // Need to re-click on the resizer.
      triggerMouseMove(fixture, 100, MouseEventButtons.LEFT);

      mouseDownOnResizer(fixture);
      triggerMouseMove(fixture, 700);

      expect(dispatchedActions).toEqual([
        sideBarWidthChanged({widthInPercent: 100}),
        sideBarWidthChanged({widthInPercent: 70}),
      ]);
    });

    it('stops resizing when mouseuped', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      mouseDownOnResizer(fixture);
      triggerMouseMove(fixture, 1000);
      triggerMouseUp(fixture);
      triggerMouseMove(fixture, 700);

      expect(dispatchedActions).toEqual([
        sideBarWidthChanged({widthInPercent: 100}),
      ]);
    });

    it('collapses the sidebar when mousemoved to 75px or smaller', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      mouseDownOnResizer(fixture);
      triggerMouseMove(fixture, 75);
      triggerMouseMove(fixture, -100);

      expect(dispatchedActions).toEqual([
        sideBarWidthChanged({widthInPercent: 0}),
        sideBarWidthChanged({widthInPercent: 0}),
      ]);
    });

    it('dispatches action to width 20% when clicking on expander', () => {
      store.overrideSelector(getSideBarWidthInPercent, 0);
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();

      fixture.debugElement.query(byCss.EXPANDER).nativeElement.click();

      expect(dispatchedActions).toEqual([
        sideBarWidthChanged({widthInPercent: 20}),
      ]);
    });
  });
});
