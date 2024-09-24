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

import {Component, DebugElement, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {provideMockTbStore} from '../../testing/utils';
import {navigationRequested} from '../actions';
import {AppRootProvider, TestableAppRootProvider} from '../app_root';
import {LocationModule} from '../location_module';
import {RouterLinkDirectiveContainer} from './router_link_directive_container';

@Component({
  standalone: false,
  selector: 'test',
  template: '<a [routerLink]="link">testable link</a>',
})
class TestableComponent {
  @Input() link!: string | string[];
  @Input() resetNamespacedState?: boolean;
}

@Component({
  standalone: false,
  selector: 'test-with-reset',
  template:
    '<a [routerLink]="link" [resetNamespacedState]="resetNamespacedState">testable link</a>',
})
class TestableComponentWithResetNamespacedState {
  @Input() link!: string | string[];
  @Input() resetNamespacedState!: boolean;
}

describe('router_link', () => {
  let actualDispatches: Action[];
  let appRootProvider: TestableAppRootProvider;

  beforeEach(async () => {
    actualDispatches = [];

    await TestBed.configureTestingModule({
      imports: [LocationModule, NoopAnimationsModule],
      providers: [
        provideMockTbStore(),
        {provide: AppRootProvider, useClass: TestableAppRootProvider},
      ],
      declarations: [
        RouterLinkDirectiveContainer,
        TestableComponent,
        TestableComponentWithResetNamespacedState,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    appRootProvider = TestBed.inject(
      AppRootProvider
    ) as TestableAppRootProvider;

    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualDispatches.push(action);
    });
  });

  function createComponent(link: string | string[]): DebugElement {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.link = link;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('a'));
  }

  function createComponentWithResetNamespacedState(
    link: string | string[],
    resetNamespacedState: boolean
  ): DebugElement {
    const fixture = TestBed.createComponent(
      TestableComponentWithResetNamespacedState
    );
    fixture.componentInstance.link = link;
    fixture.componentInstance.resetNamespacedState = resetNamespacedState;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('a'));
  }

  it('renders the path as href', () => {
    const anchorStr = createComponent('/foobar');
    expect(anchorStr.attributes['href']).toBe('/foobar/');

    const anchorArr = createComponent(['/foobar', 'baz']);
    expect(anchorArr.attributes['href']).toBe('/foobar/baz/');
  });

  it('renders the path as href with appRoot to support path_prefix', () => {
    appRootProvider.setAppRoot('/qaz/quz/');
    const anchorStr = createComponent('/foobar');
    expect(anchorStr.attributes['href']).toBe('/qaz/quz/foobar/');

    const anchorArr = createComponent(['/foobar', 'baz']);
    expect(anchorArr.attributes['href']).toBe('/qaz/quz/foobar/baz/');
  });

  it('dispatches navigate when clicked on the anchor', () => {
    const link = createComponent('/foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: '/foobar/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('dispatches programmatical navigation without appRoot', () => {
    appRootProvider.setAppRoot('/qaz/quz/');
    const link = createComponent('../foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: '../foobar/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('supports relative path (..)', () => {
    const link = createComponent('../foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: '../foobar/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('supports relative path (no slash)', () => {
    const link = createComponent('foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: 'foobar/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('makes sure the path ends with "/"', () => {
    const event = new MouseEvent('click');
    const link1 = createComponent('./foobar');
    link1.triggerEventHandler('click', event);
    const link2 = createComponent('./foobar/');
    link2.triggerEventHandler('click', event);
    const link3 = createComponent('/');
    link3.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: './foobar/',
        resetNamespacedState: false,
      }),
      navigationRequested({
        pathname: './foobar/',
        resetNamespacedState: false,
      }),
      navigationRequested({
        pathname: '/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('passes resetNamespacedState=false in action', () => {
    const event = new MouseEvent('click');
    const link = createComponentWithResetNamespacedState('./foobar', false);
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: './foobar/',
        resetNamespacedState: false,
      }),
    ]);
  });

  it('passes resetNamespacedState=true in action', () => {
    const event = new MouseEvent('click');
    const link = createComponentWithResetNamespacedState('./foobar', true);
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: './foobar/',
        resetNamespacedState: true,
      }),
    ]);
  });

  it('prevents default behavior when clicked', () => {
    const link = createComponent('/foobar');
    const event = new MouseEvent('click');
    const preventDefault = spyOn(event, 'preventDefault');
    link.triggerEventHandler('click', event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(event.cancelBubble).toBe(true);
  });

  it('ignores the click when pressed ctrl', () => {
    const link = createComponent('/foobar');
    const event = new MouseEvent('click', {ctrlKey: true});
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([]);
  });

  it('ignores the click when pressed meta key', () => {
    const link = createComponent('/foobar');
    const event = new MouseEvent('click', {metaKey: true});
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([]);
  });

  it('requires path to be non-emtpy', () => {
    expect(() => createComponent([])).toThrowError(
      RangeError,
      /should have proper path/
    );
  });
});
