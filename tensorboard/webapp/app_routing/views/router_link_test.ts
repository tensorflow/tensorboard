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
import {MockStore, provideMockStore} from '@ngrx/store/testing';

import {State} from '../../app_state';
import {navigationRequested} from '../actions';
import {LocationModule} from '../location_module';

import {RouterLinkDirectiveContainer} from './router_link_directive_container';

@Component({
  selector: 'test',
  template: '<a [routerLink]="link">testable link</a>',
})
class TestableComponent {
  @Input() link!: string | string[];
}

describe('router_link', () => {
  let actualDispatches: Action[];

  beforeEach(async () => {
    actualDispatches = [];
    await TestBed.configureTestingModule({
      imports: [LocationModule, NoopAnimationsModule],
      providers: [provideMockStore()],
      declarations: [RouterLinkDirectiveContainer, TestableComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualDispatches.push(action);
    });
  });

  function createComponentAndGetAnchorDebugElement(
    link: string | string[]
  ): DebugElement {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.link = link;
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('a'));
  }

  it('renders the path as href', () => {
    const anchorStr = createComponentAndGetAnchorDebugElement('/foobar');
    expect(anchorStr.attributes['href']).toBe('/foobar/');

    const anchorArr = createComponentAndGetAnchorDebugElement([
      '/foobar',
      'baz',
    ]);
    expect(anchorArr.attributes['href']).toBe('/foobar/baz/');
  });

  it('dispatches navigate when clicked on the anchor', () => {
    const link = createComponentAndGetAnchorDebugElement('/foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: '/foobar/',
      }),
    ]);
  });

  it('supports relative path (..)', () => {
    const link = createComponentAndGetAnchorDebugElement('../foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: '../foobar/',
      }),
    ]);
  });

  it('supports relative path (no slash)', () => {
    const link = createComponentAndGetAnchorDebugElement('foobar');
    const event = new MouseEvent('click');
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: 'foobar/',
      }),
    ]);
  });

  it('makes sure the path ends with "/"', () => {
    const event = new MouseEvent('click');
    const link1 = createComponentAndGetAnchorDebugElement('./foobar');
    link1.triggerEventHandler('click', event);
    const link2 = createComponentAndGetAnchorDebugElement('./foobar/');
    link2.triggerEventHandler('click', event);
    const link3 = createComponentAndGetAnchorDebugElement('/');
    link3.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([
      navigationRequested({
        pathname: './foobar/',
      }),
      navigationRequested({
        pathname: './foobar/',
      }),
      navigationRequested({
        pathname: '/',
      }),
    ]);
  });

  it('prevents default behavior when clicked', () => {
    const link = createComponentAndGetAnchorDebugElement('/foobar');
    const event = new MouseEvent('click');
    const preventDefault = spyOn(event, 'preventDefault');
    link.triggerEventHandler('click', event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(event.cancelBubble).toBe(true);
  });

  it('ignores the click when pressed ctrl', () => {
    const link = createComponentAndGetAnchorDebugElement('/foobar');
    const event = new MouseEvent('click', {ctrlKey: true});
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([]);
  });

  it('ignores the click when pressed meta key', () => {
    const link = createComponentAndGetAnchorDebugElement('/foobar');
    const event = new MouseEvent('click', {metaKey: true});
    link.triggerEventHandler('click', event);

    expect(actualDispatches).toEqual([]);
  });

  it('requires path to be non-emtpy', () => {
    expect(() => createComponentAndGetAnchorDebugElement([])).toThrowError(
      RangeError,
      /should have proper path/
    );
  });
});
