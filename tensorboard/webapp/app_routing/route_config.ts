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
import {ConcreteRouteDef, RouteDef} from './route_config_types';
import {Route, RouteKind, RouteParams} from './types';

interface NegativeMatch {
  result: false;
}

interface PositiveMatch {
  result: true;
  params: RouteParams;
  pathParts: string[];
  isRedirection: boolean;
}

type Match = NegativeMatch | PositiveMatch;

type PathPartMatch =
  | {
      isParamPathPart: false;
      partMatched: boolean;
    }
  | {
      partMatched: boolean;
      isParamPathPart: true;
      paramName: string;
      paramValue: string;
    };

type PathMatcher = (pathPartQuery: string) => PathPartMatch;

interface NonParamPathFragment {
  pathPart: string;
  isParam: false;
}

interface ParamPathFragment {
  pathPart: string;
  isParam: true;
  paramName: string;
}

type PathFragment = ParamPathFragment | NonParamPathFragment;

function getPathFragments(path: string): PathFragment[] {
  const parts = getPathParts(path);
  return parts.map((part) => {
    const isParam = part.startsWith(':');
    if (!isParam) {
      return {pathPart: part, isParam};
    }
    return {
      pathPart: part,
      isParam: true,
      paramName: part.slice(1),
    };
  });
}

class RouteConfigMatcher {
  private readonly pathFragments: PathFragment[];
  private readonly pathMatchers: PathMatcher[];
  private readonly redirectionFragments: PathFragment[] | null;

  constructor(readonly config: RouteDef) {
    this.validateConfig(config);
    this.pathFragments = getPathFragments(config.path);
    this.pathMatchers = this.getPathMatchers(this.pathFragments);
    this.redirectionFragments =
      config.routeKind === null
        ? getPathFragments(config.redirectionPath)
        : null;
  }

  private validateConfig({path}: RouteDef) {
    if (!path.startsWith('/')) {
      throw new RangeError(`config.path should start with '/'. ${path}`);
    }

    let colonIndex = 0;
    while ((colonIndex = path.indexOf(':', colonIndex + 1)) >= 0) {
      if (path[colonIndex - 1] !== '/') {
        throw new RangeError(
          `config.path parameter should come after '/'. ${path}`
        );
      }
      if (path[colonIndex + 1] === undefined || path[colonIndex + 1] === '/') {
        throw new RangeError(
          `config.path parameter should have non-empty name. ${path}`
        );
      }
    }
  }

  private getPathMatchers(pathFragments: PathFragment[]): PathMatcher[] {
    return pathFragments.map((fragment) => {
      const {pathPart} = fragment;
      if (fragment.isParam) {
        return (pathPartQuery: string) => {
          return {
            isParamPathPart: true,
            partMatched: true,
            paramName: fragment.paramName,
            paramValue: pathPartQuery,
          };
        };
      }
      return (pathPartQuery: string) => {
        return {
          isParamPathPart: false,
          partMatched: pathPartQuery === pathPart,
        };
      };
    });
  }

  /**
   * In case of parameter reprojection failure (cannot create redirection
   * pathname from parameter present in current pathname), it throws a
   * RangeError.
   */
  match(pathParts: string[]): Match {
    let combinedParams: Record<string, string> = {};
    if (this.pathMatchers.length !== pathParts.length) {
      return {result: false};
    }

    let pathIndex = 0;
    for (const matcher of this.pathMatchers) {
      const pathToMatch = pathParts[pathIndex++];
      const match = matcher(pathToMatch);
      if (!match.partMatched) {
        return {result: false};
      }
      if (match.isParamPathPart) {
        combinedParams = {
          ...combinedParams,
          [match.paramName]: match.paramValue,
        };
      }
    }

    if (this.redirectionFragments) {
      const newPathParts = this.reprojectPathByParams(
        this.redirectionFragments,
        combinedParams
      );
      return {
        result: true,
        params: combinedParams,
        pathParts: newPathParts,
        isRedirection: true,
      };
    }

    return {
      result: true,
      params: combinedParams,
      pathParts,
      isRedirection: false,
    };
  }

  /**
   * Reprojects route parameter values to path fragments for path parts.
   */
  private reprojectPathByParams(
    pathFragments: PathFragment[],
    params: RouteParams
  ): string[] {
    const pathParts: string[] = [];
    for (const fragment of pathFragments) {
      if (fragment.isParam) {
        const {paramName} = fragment;
        if (!params.hasOwnProperty(paramName)) {
          throw new RangeError(
            `Failed to reproject parameter. "${paramName}" parameter ` +
              'should be present.'
          );
        }
        pathParts.push(params[paramName]);
      } else {
        pathParts.push(fragment.pathPart);
      }
    }
    return pathParts;
  }

  /**
   * In case of parameter projection failure (cannot create pathname), it throws
   * a RangeError.
   */
  matchByParams(params: RouteParams): PositiveMatch {
    const pathParts = this.reprojectPathByParams(this.pathFragments, params);

    return {
      result: true,
      params,
      pathParts,
      isRedirection: false,
    };
  }
}

export interface RouteMatch {
  routeKind: Route['routeKind'];
  pathname: Route['pathname'];
  params: Route['params'];
  deepLinkProvider: ConcreteRouteDef['deepLinkProvider'] | null;
}

export class RouteConfigs {
  private readonly routeKindToConfigMatchers: Map<
    RouteKind,
    RouteConfigMatcher
  >;
  private readonly configMatchers: RouteConfigMatcher[];
  private readonly defaultRouteConfig: RouteConfigMatcher | null;

  constructor(
    configs: RouteDef[],
    private readonly maxRedirection: number = 3
  ) {
    if (maxRedirection < 0) {
      throw new RangeError('maxRedirection has to be non-negative number');
    }

    this.validateRouteConfigs(configs);

    this.defaultRouteConfig = null;
    this.routeKindToConfigMatchers = new Map();
    this.configMatchers = [];

    for (const config of configs) {
      const matcher = new RouteConfigMatcher(config);

      this.configMatchers.push(matcher);

      if (matcher.config.routeKind !== null) {
        this.routeKindToConfigMatchers.set(matcher.config.routeKind, matcher);

        if (matcher.config.defaultRoute) {
          this.defaultRouteConfig = matcher;
        }
      }
    }
  }

  private validateRouteConfigs(configs: RouteDef[]) {
    const defaultRoutes = configs.filter((routeDef) => {
      return Boolean(routeDef.routeKind !== null && routeDef.defaultRoute);
    });

    if (defaultRoutes.length > 1) {
      const paths = defaultRoutes.map(({path}) => path).join(', ');
      throw new RangeError(`There are more than one defaultRoutes. ${paths}`);
    } else if (defaultRoutes.length === 1) {
      const {path} = defaultRoutes[0];
      const hasParam = Boolean(
        getPathFragments(path).find(({isParam}) => isParam)
      );

      if (hasParam) {
        throw new RangeError(`A defaultRoute cannot have any params. ${path}`);
      }
    }

    const routeKindConfig = new Set<RouteKind>();
    for (const {routeKind} of configs) {
      if (routeKind === null) {
        continue;
      }

      if (routeKindConfig.has(routeKind)) {
        throw new RangeError(
          `Multiple route configuration for kind: ${routeKind}. ` +
            'Configurations should have unique routeKinds'
        );
      }
      routeKindConfig.add(routeKind);
    }
  }

  match(navigation: {pathname: string}): RouteMatch | null {
    if (!navigation.pathname.startsWith('/')) {
      throw new RangeError(
        'Navigation has to made with pathname that starts with "/"'
      );
    }

    let pathParts = getPathParts(navigation.pathname);
    let redirectionCount = 0;

    while (true) {
      let wasRedirected = false;

      for (const matcher of this.configMatchers) {
        const match = matcher.match(pathParts);
        if (match.result) {
          const {params, pathParts: newPathParts, isRedirection} = match;
          if (isRedirection) {
            pathParts = newPathParts;
            wasRedirected = true;
            break;
          }

          const config = matcher.config as ConcreteRouteDef;
          return {
            routeKind: config.routeKind,
            params,
            pathname: getPathFromParts(newPathParts),
            deepLinkProvider: config.deepLinkProvider || null,
          };
        }
      }
      if (wasRedirected) {
        redirectionCount++;
      }
      if (redirectionCount > this.maxRedirection || !wasRedirected) {
        // If not redirected, no need to rematch the routes. Abort.
        break;
      }
    }

    if (redirectionCount > this.maxRedirection) {
      throw new Error(
        `Potential redirection loop (redirecting more than ` +
          `${this.maxRedirection} times. Please do not have cycles in the ` +
          `routes.`
      );
    }

    if (this.defaultRouteConfig) {
      const config = this.defaultRouteConfig.config as ConcreteRouteDef;
      return {
        routeKind: config.routeKind,
        params: {},
        pathname: config.path,
        deepLinkProvider: config.deepLinkProvider || null,
      };
    }

    return null;
  }

  matchByRouteKind(
    routeKind: RouteKind,
    params: RouteParams
  ): RouteMatch | null {
    const matcher = this.routeKindToConfigMatchers.get(routeKind);

    if (!matcher || !matcher.config.routeKind) {
      throw new RangeError(
        `Requires configuration for routeKind: ${routeKind}`
      );
    }

    const match = matcher.matchByParams(params);
    const config = matcher.config;
    return {
      routeKind,
      params,
      pathname: getPathFromParts(match.pathParts),
      deepLinkProvider: config.deepLinkProvider || null,
    };
  }
}

function getPathParts(path: string): string[] {
  return path.split('/').slice(1);
}

function getPathFromParts(pathParts: string[]): string {
  return '/' + pathParts.join('/');
}
