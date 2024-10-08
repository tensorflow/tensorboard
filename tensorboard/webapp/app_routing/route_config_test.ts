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

import {Component} from '@angular/core';
import {createAction, props} from '@ngrx/store';
import {RouteConfigs, RouteMatch} from './route_config';
import {ConcreteRouteDef, RedirectionRouteDef} from './route_config_types';
import {Navigation, RouteKind} from './types';

@Component({standalone: false, selector: 'test', template: ''})
class TestableComponent {}

function buildConcreteRouteDef(override: Partial<ConcreteRouteDef>) {
  return {
    routeKind: RouteKind.UNKNOWN,
    path: 'unknown',
    ngComponent: TestableComponent,
    ...override,
  };
}

function buildRedirectionRouteDef(override: Partial<RedirectionRouteDef>) {
  return {
    path: 'unknown',
    redirectionPath: 'unknown',
    ...override,
  };
}

function buildNavigation(
  override: Partial<Navigation> & {pathname: string}
): Navigation {
  return {
    ...override,
  };
}

function buildRouteMatch(override: Partial<RouteMatch> = {}): RouteMatch {
  return {
    routeKind: RouteKind.UNKNOWN,
    pathname: '',
    params: {},
    deepLinkProvider: null,
    originateFromRedirection: false,
    action: null,
    ...override,
  } as RouteMatch;
}

/**
 * An Action to use for testing RouteDef's actionGenerator property.
 */
const FakeAction = createAction('My fake action', props<{path: string[]}>());

describe('route config', () => {
  describe('validation', () => {
    it('throws if there are more than one instances of defaultRoute', () => {
      expect(() => {
        return new RouteConfigs([
          buildConcreteRouteDef({
            routeKind: RouteKind.UNKNOWN,
            path: 'foo',
            defaultRoute: true,
          }),
          buildConcreteRouteDef({
            routeKind: RouteKind.EXPERIMENT,
            path: 'bar',
            defaultRoute: false,
          }),
          buildConcreteRouteDef({
            routeKind: RouteKind.EXPERIMENTS,
            path: 'baz',
            defaultRoute: true,
          }),
        ]);
      }).toThrowError(RangeError, /more than one defaultRoutes/);
    });

    it('throws if the default route has param', () => {
      expect(() => {
        return new RouteConfigs([
          buildConcreteRouteDef({path: 'foo/:bar', defaultRoute: true}),
        ]);
      }).toThrowError(RangeError, /defaultRoute cannot have any params/);
    });

    it('throws when a path does not start with "/"', () => {
      expect(() => {
        return new RouteConfigs([buildConcreteRouteDef({path: 'foo'})]);
      }).toThrowError(RangeError, /should start with '\/'/);
    });

    it('throws if it param is mixed with path', () => {
      expect(() => {
        return new RouteConfigs([
          buildConcreteRouteDef({path: '/tensor:flow'}),
        ]);
      }).toThrowError(RangeError, /should come after '\/'/);
    });

    it('throws if it param name is missing', () => {
      expect(() => {
        return new RouteConfigs([buildConcreteRouteDef({path: '/t/:/'})]);
      }).toThrowError(RangeError, /non-empty name/);
    });

    it('throws if there are configurations with the same routeKind', () => {
      expect(() => {
        return new RouteConfigs([
          buildConcreteRouteDef({
            routeKind: RouteKind.EXPERIMENTS,
            path: '/foo',
          }),
          buildConcreteRouteDef({
            routeKind: RouteKind.EXPERIMENTS,
            path: '/bar',
          }),
          buildConcreteRouteDef({
            routeKind: RouteKind.UNKNOWN,
            path: '/baz',
          }),
        ]);
      }).toThrowError(RangeError, /Multiple route configuration for kind/);
    });
  });

  describe('match', () => {
    it('throws if navigation path does not start with "/"', () => {
      const config = new RouteConfigs([buildConcreteRouteDef({path: '/tb'})]);

      expect(() => {
        return config.match(buildNavigation({pathname: 'tb'}));
      }).toThrowError(RangeError, /that starts with "\/"/);
    });

    it('matches the exact matches when there is no variable', () => {
      const config = new RouteConfigs([buildConcreteRouteDef({path: '/tb'})]);

      expect(config.match(buildNavigation({pathname: '/tb'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/tb',
          params: {},
        })
      );
    });

    it('matches longer elaborate path', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({path: '/tb/bar/baz'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/bar/baz'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/tb/bar/baz',
          params: {},
        })
      );
    });

    it('matches the param', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({path: '/tb/:bar/baz'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/foo/baz'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/tb/foo/baz',
          params: {bar: 'foo'},
        })
      );
    });

    it('populates the queryParams of the navigation', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          path: '/tb/bar/baz',
        }),
      ]);

      expect(
        config.match(
          buildNavigation({
            pathname: '/tb/bar/baz',
          })
        )
      ).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/tb/bar/baz',
          params: {},
        })
      );
    });

    it('carries queryParam from the navigation when there is no match', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb/bestest',
          defaultRoute: true,
        }),
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENTS,
          path: '/tb/good',
        }),
      ]);

      expect(
        config.match(
          buildNavigation({
            pathname: '/tb/best',
          })
        )
      ).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/tb/bestest',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('calls actionGenerator if specified', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb/:foo/:bar',
          actionGenerator: (path) => {
            return FakeAction({path});
          },
        }),
      ]);

      const match = config.match(buildNavigation({pathname: '/tb/a/b'}));
      expect(match!.action).toEqual(FakeAction({path: ['tb', 'a', 'b']}));
    });

    it('does not when the route is different', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({path: '/tb/bar/baz'}),
      ]);

      expect(
        config.match(buildNavigation({pathname: '/tf/bar/baz'}))
      ).toBeNull();
    });

    it('does not when the route is different length', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({path: '/tb/bar/baz'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/bar'}))).toBeNull();
    });

    it('returns defaultRoute if it matches nothing', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb',
          defaultRoute: true,
        }),
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENTS,
          path: '/tf',
        }),
        buildConcreteRouteDef({
          routeKind: RouteKind.UNKNOWN,
          path: '/flow',
        }),
      ]);

      expect(config.match(buildNavigation({pathname: '/board'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/tb',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('calls defaultRoute actionGenerator if specified', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb',
          defaultRoute: true,
          actionGenerator: (path) => {
            return FakeAction({path});
          },
        }),
      ]);

      const match = config.match(buildNavigation({pathname: '/blah/a/b/c'}));
      expect(match!.action).toEqual(
        FakeAction({path: ['blah', 'a', 'b', 'c']})
      );
    });
  });

  describe('matchByRouteKind', () => {
    it('matches a route by route kind and params', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({routeKind: RouteKind.EXPERIMENT, path: '/tb'}),
      ]);

      expect(config.matchByRouteKind(RouteKind.EXPERIMENT, {})).toEqual({
        originateFromRedirection: false,
        routeKind: RouteKind.EXPERIMENT,
        params: {},
        pathname: '/tb',
        deepLinkProvider: null,
        action: null,
      });
    });

    it('reprojects parameter in object to the pathname', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb/:foo/bar/:baz',
        }),
      ]);

      const match = config.matchByRouteKind(RouteKind.EXPERIMENT, {
        foo: 'a',
        bar: 'b',
        baz: 'c',
      });

      expect(match).not.toBeNull();
      expect(match!.pathname).toBe('/tb/a/bar/c');
    });

    it('calls actionGenerator if specified', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb/:foo/:bar',
          actionGenerator: (path) => {
            return FakeAction({path});
          },
        }),
      ]);

      const match = config.matchByRouteKind(RouteKind.EXPERIMENT, {
        foo: 'a',
        bar: 'b',
      });
      expect(match!.action).toEqual(FakeAction({path: ['tb', 'a', 'b']}));
    });

    it('throws when routeKind is not matching any known config', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({routeKind: RouteKind.EXPERIMENT, path: '/tb'}),
      ]);

      expect(() => config.matchByRouteKind(RouteKind.UNKNOWN, {})).toThrowError(
        RangeError,
        /Requires configuration for routeKind/
      );
    });

    it('throws when parameter misses one declared by route path', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/tb/:foo/',
        }),
      ]);

      expect(() =>
        config.matchByRouteKind(RouteKind.EXPERIMENT, {})
      ).toThrowError(
        RangeError,
        /Failed to reproject parameter. "foo" parameter/
      );
    });
  });

  describe('redirection', () => {
    it('redirects a path to another route', () => {
      const config = new RouteConfigs([
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/board/',
        }),
        buildRedirectionRouteDef({path: '/tensor', redirectionPath: '/board/'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tensor'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/board/',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('redirects to a route with correct parameters', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({
          path: '/tensor/:eid',
          redirectionPath: '/board/:eid',
        }),
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/board/:eid',
        }),
      ]);

      expect(config.match(buildNavigation({pathname: '/tensor/123'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/board/123',
          params: {eid: '123'},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('redirects to another redirection', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({path: '/a', redirectionPath: '/b'}),
        buildRedirectionRouteDef({path: '/b', redirectionPath: '/c'}),
        buildConcreteRouteDef({routeKind: RouteKind.UNKNOWN, path: '/c'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/a'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/c',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('throws error if reprojection fails due to missing param', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({
          path: '/tensor/:eid',
          redirectionPath: '/board/:not_eid',
        }),
      ]);

      expect(() =>
        config.match(buildNavigation({pathname: '/tensor/123'}))
      ).toThrowError(Error, /Failed to reproject parameter. "not_eid"/);
    });

    it('reprojects from param-ful to param-less', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({
          path: '/tensor/:eid',
          redirectionPath: '/board/',
        }),
        buildConcreteRouteDef({
          path: '/board/',
        }),
      ]);

      expect(config.match(buildNavigation({pathname: '/tensor/123'}))).toEqual(
        buildRouteMatch({
          pathname: '/board/',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('throws error when there is a cycle in redirection', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({path: '/a', redirectionPath: '/b'}),
        buildRedirectionRouteDef({path: '/b', redirectionPath: '/c'}),
        buildRedirectionRouteDef({path: '/c', redirectionPath: '/a'}),
      ]);

      expect(() =>
        config.match(buildNavigation({pathname: '/a'}))
      ).toThrowError(Error, /Potential redirection loop/);
    });

    it('throws error when there are more than N number of redirections', () => {
      const config = new RouteConfigs(
        [
          buildRedirectionRouteDef({path: '/a', redirectionPath: '/b'}),
          buildRedirectionRouteDef({path: '/b', redirectionPath: '/c'}),
          buildRedirectionRouteDef({path: '/c', redirectionPath: '/concrete'}),
          buildConcreteRouteDef({
            path: '/concrete',
          }),
        ],
        2 /* maxRedirection */
      );

      expect(() =>
        config.match(buildNavigation({pathname: '/a'}))
      ).toThrowError(Error, /Potential redirection loop/);
    });

    it('supports the mode where we set maxRedirection to 0', () => {
      const config = new RouteConfigs(
        [
          buildRedirectionRouteDef({path: '/a', redirectionPath: '/concrete/'}),
          buildConcreteRouteDef({
            routeKind: RouteKind.UNKNOWN,
            path: '/concrete',
          }),
          buildConcreteRouteDef({
            routeKind: RouteKind.EXPERIMENT,
            path: '/default',
            defaultRoute: true,
          }),
        ],
        0 /* maxRedirection */
      );

      expect(() =>
        config.match(buildNavigation({pathname: '/a'}))
      ).toThrowError(Error, /Potential redirection loop/);

      expect(config.match(buildNavigation({pathname: '/concrete'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.UNKNOWN,
          pathname: '/concrete',
          params: {},
        })
      );

      expect(config.match(buildNavigation({pathname: '/foo'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/default',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('redirects to default route if redirectionPath is not known', () => {
      const config = new RouteConfigs([
        buildRedirectionRouteDef({path: '/a', redirectionPath: '/b'}),
        buildConcreteRouteDef({path: '/c', defaultRoute: true}),
      ]);

      expect(config.match(buildNavigation({pathname: '/a'}))).toEqual(
        buildRouteMatch({
          pathname: '/c',
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });
  });

  describe('programmatical redirection', () => {
    it('redirects based on returned value on redirector', () => {
      const config = new RouteConfigs([
        {
          path: '/tensor/:eid',
          redirector: (paths) => {
            const eidPart = paths[1];
            return {
              pathParts: eidPart === '123' ? ['board'] : ['rocks'],
            };
          },
        },
        buildConcreteRouteDef({
          routeKind: RouteKind.EXPERIMENT,
          path: '/rocks',
        }),
        buildConcreteRouteDef({
          routeKind: RouteKind.COMPARE_EXPERIMENT,
          path: '/board',
        }),
      ]);

      expect(config.match(buildNavigation({pathname: '/tensor/123'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.COMPARE_EXPERIMENT,
          pathname: '/board',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
      expect(config.match(buildNavigation({pathname: '/tensor/6006'}))).toEqual(
        buildRouteMatch({
          routeKind: RouteKind.EXPERIMENT,
          pathname: '/rocks',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('redirects multiple times', () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:eid',
          redirector: (paths) => {
            return {pathParts: [paths[1]]};
          },
        },
        buildRedirectionRouteDef({
          path: '/redirect',
          redirectionPath: '/tensorboard',
        }),
        buildConcreteRouteDef({path: '/tensorboard'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/redirect'}))).toEqual(
        buildRouteMatch({
          pathname: '/tensorboard',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('handles an opaque parameter in path parts', () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:first/hey/:second/',
          redirector: () => {
            return {pathParts: ['hello']};
          },
        },
        buildConcreteRouteDef({path: '/hello'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/foo'}))).toBe(null);
      expect(config.match(buildNavigation({pathname: '/tb/foo/hey'}))).toBe(
        null
      );
      expect(config.match(buildNavigation({pathname: '/tb/foo/hey/bar'}))).toBe(
        null
      );
      expect(
        config.match(buildNavigation({pathname: '/tb/foo/hey/bar/'}))
      ).toEqual(
        buildRouteMatch({
          pathname: '/hello',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });

    it('matches nothing if redirector matches unknown route path parts', () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:eid',
          redirector: (paths) => {
            return {pathParts: [paths[1]]};
          },
        },
        buildConcreteRouteDef({path: '/tensorboard'}),
      ]);

      expect(
        config.match(buildNavigation({pathname: '/tb/redirect'}))
      ).toBeNull();
    });

    it('returns query parameter from redirect matcher', () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:eid',
          redirector: (paths) => {
            return {
              pathParts: [paths[1]],
              queryParams: [{key: 'hello', value: 'world'}],
            };
          },
        },
        buildConcreteRouteDef({path: '/tensorboard'}),
      ]);

      expect(
        config.match(buildNavigation({pathname: '/tb/tensorboard'}))
      ).toEqual(
        buildRouteMatch({
          pathname: '/tensorboard',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: [{key: 'hello', value: 'world'}],
        })
      );
    });

    it("returns last redirect matcher's query params", () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:eid',
          redirector: (paths) => {
            return {
              pathParts: [paths[1]],
              queryParams: [{key: 'goodbye', value: 'world'}],
            };
          },
        },
        {
          path: '/hello',
          redirector: (paths) => {
            return {
              pathParts: ['tensorboard'],
              queryParams: [{key: 'hello', value: 'world'}],
            };
          },
        },
        buildConcreteRouteDef({path: '/tensorboard'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/hello'}))).toEqual(
        buildRouteMatch({
          pathname: '/tensorboard',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: [{key: 'hello', value: 'world'}],
        })
      );
    });

    it('drops programmatical query parameter if redirected to static one', () => {
      const config = new RouteConfigs([
        {
          path: '/tb/:eid',
          redirector: (paths) => {
            return {
              pathParts: [paths[1]],
              queryParams: [{key: 'goodbye', value: 'world'}],
            };
          },
        },
        buildRedirectionRouteDef({
          path: '/hello',
          redirectionPath: '/tensorboard',
        }),
        buildConcreteRouteDef({path: '/tensorboard'}),
      ]);

      expect(config.match(buildNavigation({pathname: '/tb/hello'}))).toEqual(
        buildRouteMatch({
          pathname: '/tensorboard',
          params: {},
          originateFromRedirection: true,
          redirectionOnlyQueryParams: undefined,
        })
      );
    });
  });
});
