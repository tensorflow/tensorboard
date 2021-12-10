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

import {TestBed} from '@angular/core/testing';
import {createAction} from '@ngrx/store';
import {
  NavigateToCompare,
  NavigateToExperiments,
  ProgrammaticalNavigationModule,
} from './programmatical_navigation_module';
import {RouteKind} from './types';

const testAction = createAction('[TEST] My Test Action');
const otherTestAction = createAction('[TEST] My Other Test Action');

describe('programmatical navigation module test', () => {
  it('registers a navigation provider', async () => {
    function provider() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction) => {
          if (action.type !== testAction.type) {
            throw new Error(
              'Expected be invoked only with the action that I subscribed.'
            );
          }
          return {
            routeKind: RouteKind.EXPERIMENTS,
            routeParams: {},
          } as NavigateToExperiments;
        },
      };
    }

    await TestBed.configureTestingModule({
      imports: [
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          provider
        ),
      ],
    }).compileComponents();

    const module = TestBed.inject(ProgrammaticalNavigationModule);
    expect(module.getNavigation(testAction())).toEqual({
      routeKind: RouteKind.EXPERIMENTS,
      routeParams: {},
    });
  });

  it('returns null when getting nav for not provided action', async () => {
    function provider() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction) => {
          return {
            routeKind: RouteKind.EXPERIMENTS,
            routeParams: {},
          } as NavigateToExperiments;
        },
      };
    }

    await TestBed.configureTestingModule({
      imports: [
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          provider
        ),
      ],
    }).compileComponents();

    const module = TestBed.inject(ProgrammaticalNavigationModule);
    expect(module.getNavigation(otherTestAction())).toBe(null);
  });

  it('returns null when lambda does not provide a navigation', async () => {
    function provider() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction) => null,
      };
    }

    await TestBed.configureTestingModule({
      imports: [
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          provider
        ),
      ],
    }).compileComponents();

    const module = TestBed.inject(ProgrammaticalNavigationModule);
    expect(module.getNavigation(testAction())).toBe(null);
  });

  it('throws invariant error if same action is registered twice', async () => {
    function provider1() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction) => {
          return {
            routeKind: RouteKind.EXPERIMENTS,
            routeParams: {},
          } as NavigateToExperiments;
        },
      };
    }

    function provider2() {
      return {
        actionCreator: testAction,
        lambda: (action: typeof testAction): NavigateToCompare => {
          return {
            routeKind: RouteKind.COMPARE_EXPERIMENT,
            routeParams: {
              aliasAndExperimentIds: [
                {
                  alias: 'Foo',
                  id: 'foo',
                },
              ],
            },
          };
        },
      };
    }

    await TestBed.configureTestingModule({
      imports: [
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          provider1
        ),
        ProgrammaticalNavigationModule.registerProgrammaticalNavigation(
          provider2
        ),
      ],
    }).compileComponents();

    expect(() => TestBed.inject(ProgrammaticalNavigationModule)).toThrowError(
      RangeError,
      /already registered for nav./
    );
  });
});
