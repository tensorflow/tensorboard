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

import {Component, NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {provideMockTbStore} from '../../testing/utils';
import {RouteRegistryModule} from '../route_registry_module';
import {
  getActiveRoute,
  getNextRouteForRouterOutletOnly,
} from '../store/app_routing_selectors';
import {buildRoute} from '../testing';
import {RouteKind} from '../types';
import {RouterOutletComponent} from './router_outlet_component';
import {RouterOutletContainer} from './router_outlet_container';

@Component({
  standalone: false,
  selector: 'first',
  template: 'I am a test',
})
class FirstTestableComponent {}

@Component({
  standalone: false,
  selector: 'second',
  template: 'I am inevitable',
})
class SecondTestableComponent {}

describe('router_outlet', () => {
  let store: MockStore<State>;
  let getNgComponentByRouteKindSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, RouteRegistryModule],
      providers: [provideMockTbStore()],
      declarations: [
        RouterOutletComponent,
        RouterOutletContainer,
        FirstTestableComponent,
        SecondTestableComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getActiveRoute, null);
    store.overrideSelector(getNextRouteForRouterOutletOnly, null);

    const registry = TestBed.inject<RouteRegistryModule>(RouteRegistryModule);
    getNgComponentByRouteKindSpy = spyOn(registry, 'getNgComponentByRouteKind');
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function setActiveRoute(routeKind: RouteKind) {
    store.overrideSelector(
      getActiveRoute,
      buildRoute({
        routeKind,
        params: {},
      })
    );
    store.refreshState();
  }

  it('renders nothing when activeRoute is null', () => {
    store.overrideSelector(getActiveRoute, null);

    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('');
  });

  it('renders ngComponent in the active route', () => {
    setActiveRoute(RouteKind.UNKNOWN);
    getNgComponentByRouteKindSpy.and.returnValue(FirstTestableComponent);

    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('I am a test');
  });

  it('changes the ngComponent when activeRoute changes', () => {
    setActiveRoute(RouteKind.EXPERIMENT);
    getNgComponentByRouteKindSpy
      .withArgs(RouteKind.EXPERIMENT)
      .and.returnValue(FirstTestableComponent)
      .withArgs(RouteKind.COMPARE_EXPERIMENT)
      .and.returnValue(SecondTestableComponent);
    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    setActiveRoute(RouteKind.COMPARE_EXPERIMENT);
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('I am inevitable');
  });

  it('removes current page while navigating to a new route', () => {
    store.overrideSelector(
      getActiveRoute,
      buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'foobar'},
      })
    );
    store.overrideSelector(
      getNextRouteForRouterOutletOnly,
      buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'foobarbaz'},
      })
    );
    getNgComponentByRouteKindSpy.and.returnValue(FirstTestableComponent);
    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('');

    store.overrideSelector(getNextRouteForRouterOutletOnly, null);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('I am a test');
  });

  it('does not remove page when navigating to same route kind and experiments', () => {
    store.overrideSelector(
      getActiveRoute,
      buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'foobar'},
      })
    );
    store.overrideSelector(
      getNextRouteForRouterOutletOnly,
      buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'foobar'},
      })
    );
    getNgComponentByRouteKindSpy.and.returnValue(FirstTestableComponent);
    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('I am a test');

    store.overrideSelector(
      getNextRouteForRouterOutletOnly,
      buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'foobarbaz'},
      })
    );
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.innerText).toBe('');
  });

  it('does not reuse the DOM even if the ngComponent is the same', () => {
    setActiveRoute(RouteKind.EXPERIMENT);
    getNgComponentByRouteKindSpy
      .withArgs(RouteKind.EXPERIMENT)
      .and.returnValue(FirstTestableComponent)
      .withArgs(RouteKind.COMPARE_EXPERIMENT)
      .and.returnValue(SecondTestableComponent);
    const fixture = TestBed.createComponent(RouterOutletContainer);
    fixture.detectChanges();

    const beforeElement = fixture.debugElement.query(
      By.css('router-outlet-component')
    ).nativeElement.firstElementChild;

    setActiveRoute(RouteKind.COMPARE_EXPERIMENT);
    fixture.detectChanges();

    setActiveRoute(RouteKind.EXPERIMENT);
    fixture.detectChanges();

    const afterElement = fixture.debugElement.query(
      By.css('router-outlet-component')
    ).nativeElement.firstElementChild;
    expect(beforeElement).not.toBe(afterElement);
  });
});
