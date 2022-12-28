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
import {DeepLinkProvider} from './deep_link_provider';
import {
  ConcreteRouteDef,
  isConcreteRouteDef,
  isStaticRedirectionRouteDef,
  ProgrammticRedirectionRouteDef,
  RedirectionRouteDef,
  RouteDef,
} from './route_config_types';
import {RouteKind, RouteParams, SerializableQueryParams} from './types';
import {Action} from '@ngrx/store';

interface NegativeMatch {
  result: false;
}

interface PositiveMatch {
  result: true;
  params: RouteParams;
  pathParts: string[];
  isRedirection: boolean;
  redirectionQueryParams: SerializableQueryParams | undefined;
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

abstract class RouteConfigMatcher {
  protected readonly pathFragments: PathFragment[];
  protected readonly pathMatchers: PathMatcher[];
  abstract readonly definition: RouteDef;

  static getMatcher(routeDef: RouteDef): RouteConfigMatcher {
    if (isConcreteRouteDef(routeDef)) {
      return new ConcreteRouteConfigMatcher(routeDef);
    }
    if (isStaticRedirectionRouteDef(routeDef)) {
      return new StaticRedirectionRouteConfigMatcher(routeDef);
    }
    return new ProgrammaticalRedirectionRouteConfigMatcher(routeDef);
  }

  protected constructor(routeDef: RouteDef) {
    this.validateConfig(routeDef);
    this.pathFragments = getPathFragments(routeDef.path);
    this.pathMatchers = this.getPathMatchers(this.pathFragments);
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

    return {
      result: true,
      params: combinedParams,
      pathParts,
      isRedirection: false,
      redirectionQueryParams: undefined,
    };
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
      redirectionQueryParams: undefined,
    };
  }

  /**
   * Reprojects route parameter values to path fragments for path parts.
   */
  protected reprojectPathByParams(
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
}

class ConcreteRouteConfigMatcher extends RouteConfigMatcher {
  constructor(readonly definition: ConcreteRouteDef) {
    super(definition);
  }
}

class StaticRedirectionRouteConfigMatcher extends RouteConfigMatcher {
  private readonly redirectionFragments: PathFragment[];

  constructor(readonly definition: RedirectionRouteDef) {
    super(definition);
    this.redirectionFragments = getPathFragments(definition.redirectionPath);
  }

  override match(pathParts: string[]): Match {
    const match = super.match(pathParts);

    if (!match.result) return match;

    const newPathParts = this.reprojectPathByParams(
      this.redirectionFragments,
      match.params
    );
    return {
      result: true,
      params: match.params,
      pathParts: newPathParts,
      isRedirection: true,
      redirectionQueryParams: undefined,
    };
  }
}

class ProgrammaticalRedirectionRouteConfigMatcher extends RouteConfigMatcher {
  constructor(readonly definition: ProgrammticRedirectionRouteDef) {
    super(definition);
  }

  override match(pathParts: string[]): Match {
    const match = super.match(pathParts);

    if (!match.result) return match;

    const {pathParts: newPathParts, queryParams} =
      this.definition.redirector(pathParts);
    return {
      result: true,
      params: match.params,
      pathParts: newPathParts,
      isRedirection: true,
      redirectionQueryParams: queryParams,
    };
  }
}

interface BaseRouteMatch {
  routeKind: RouteKind;
  pathname: string;
  // Route parameters. An object. Its keys are defined to be parameter defined
  // in the path spec while their respective values are string.
  params: RouteParams;
  deepLinkProvider: DeepLinkProvider | null;
  originateFromRedirection: boolean;
  // An action to dispatch, generated by ConcreteRouteDef.actionGenerator.
  action: Action | null;
}

export interface NonRedirectionRouteMatch extends BaseRouteMatch {
  originateFromRedirection: false;
}

export interface RedirectionRouteMatch extends BaseRouteMatch {
  originateFromRedirection: true;
  redirectionOnlyQueryParams: SerializableQueryParams | undefined;
}

export type RouteMatch = NonRedirectionRouteMatch | RedirectionRouteMatch;

export class RouteConfigs {
  private readonly routeKindToConcreteConfigMatchers: Map<
    RouteKind,
    ConcreteRouteConfigMatcher
  >;
  private readonly configMatchers: RouteConfigMatcher[];
  private readonly defaultRouteConfig: ConcreteRouteConfigMatcher | null;

  constructor(
    configs: RouteDef[],
    private readonly maxRedirection: number = 3
  ) {
    if (maxRedirection < 0) {
      throw new RangeError('maxRedirection has to be non-negative number');
    }

    this.validateRouteConfigs(configs);

    this.defaultRouteConfig = null;
    this.routeKindToConcreteConfigMatchers = new Map();
    this.configMatchers = [];

    for (const config of configs) {
      const matcher = RouteConfigMatcher.getMatcher(config);

      this.configMatchers.push(matcher);

      if (matcher instanceof ConcreteRouteConfigMatcher) {
        this.routeKindToConcreteConfigMatchers.set(
          matcher.definition.routeKind,
          matcher
        );

        if (matcher.definition.defaultRoute) {
          this.defaultRouteConfig = matcher;
        }
      }
    }
  }

  private validateRouteConfigs(configs: RouteDef[]) {
    const concreteDefinitions = configs.filter(
      isConcreteRouteDef
    ) as ConcreteRouteDef[];
    const defaultRoutes = concreteDefinitions.filter((def) => def.defaultRoute);

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
    for (const {routeKind} of concreteDefinitions) {
      if (routeKindConfig.has(routeKind)) {
        throw new RangeError(
          `Multiple route configuration for kind: ${routeKind}. ` +
            'Configurations should have unique routeKinds'
        );
      }
      routeKindConfig.add(routeKind);
    }
  }

  /**
   * Calls actionGenerator if it exists on the RouteDef.
   */
  private generateAction(
    definition: ConcreteRouteDef,
    pathParts: string[]
  ): Action | null {
    if (definition.actionGenerator) {
      return definition.actionGenerator(pathParts);
    }
    return null;
  }

  match(navigation: {pathname: string}): RouteMatch | null {
    if (!navigation.pathname.startsWith('/')) {
      throw new RangeError(
        'Navigation has to made with pathname that starts with "/"'
      );
    }

    let pathParts = getPathParts(navigation.pathname);
    let redirectionCount = 0;
    let wasRedirected = false;
    let redirectionOnlyQueryParams: undefined | SerializableQueryParams =
      undefined;

    while (true) {
      let hasMatch = false;
      for (const matcher of this.configMatchers) {
        const match = matcher.match(pathParts);
        if (match.result) {
          hasMatch = true;
          const {params, pathParts: newPathParts, isRedirection} = match;
          if (isRedirection) {
            pathParts = newPathParts;
            wasRedirected = true;
            redirectionOnlyQueryParams = match.redirectionQueryParams;
            break;
          }

          if (!(matcher instanceof ConcreteRouteConfigMatcher)) {
            throw new RangeError(
              'No concrete route definition `match` return redirection'
            );
          }

          const {definition} = matcher;
          const base = {
            routeKind: definition.routeKind,
            params,
            pathname: getPathFromParts(newPathParts),
            deepLinkProvider: definition.deepLinkProvider || null,
            action: this.generateAction(definition, newPathParts),
          };
          if (!wasRedirected) {
            return {
              ...base,
              originateFromRedirection: false,
            };
          }
          return {
            ...base,
            originateFromRedirection: true,
            redirectionOnlyQueryParams,
          };
        }
      }

      if (wasRedirected) {
        redirectionCount++;
      }

      if (!hasMatch || redirectionCount > this.maxRedirection) {
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
      const {definition} = this.defaultRouteConfig;
      return {
        routeKind: definition.routeKind,
        deepLinkProvider: definition.deepLinkProvider ?? null,
        pathname: definition.path,
        params: {},
        originateFromRedirection: true,
        redirectionOnlyQueryParams: undefined,
        action: this.generateAction(definition, pathParts),
      };
    }

    return null;
  }

  matchByRouteKind(
    routeKind: RouteKind,
    params: RouteParams
  ): RouteMatch | null {
    const matcher = this.routeKindToConcreteConfigMatchers.get(routeKind);

    if (!matcher) {
      throw new RangeError(
        `Requires configuration for routeKind: ${routeKind}`
      );
    }

    const match = matcher.matchByParams(params);
    return {
      routeKind,
      params,
      pathname: getPathFromParts(match.pathParts),
      deepLinkProvider: matcher.definition.deepLinkProvider || null,
      originateFromRedirection: false,
      action: this.generateAction(matcher.definition, match.pathParts),
    };
  }
}

function getPathParts(path: string): string[] {
  return path.split('/').slice(1);
}

function getPathFromParts(pathParts: string[]): string {
  return '/' + pathParts.join('/');
}
