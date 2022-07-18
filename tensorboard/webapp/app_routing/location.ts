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
import {Injectable} from '@angular/core';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {createURLSearchParamsFromSerializableQueryParams} from './internal_utils';
import {NavigationFromHistory, SerializableQueryParams} from './types';

export interface LocationInterface {
  getHref(): string;

  getSearch(): SerializableQueryParams;

  getHash(): string;

  getPath(): string;

  replaceStateUrl(url: string): void;

  pushStateUrl(url: string): void;

  replaceStateData(data: any): void;

  onPopState(): Observable<NavigationFromHistory>;

  getResolvedPath(relativePath: string): string;

  getFullPath(
    pathname: string,
    queryParams: SerializableQueryParams,
    shouldPreserveHash?: boolean
  ): string;
}

const utils = {
  getHref() {
    return window.location.href;
  },
  getSearch() {
    return window.location.search;
  },
};

@Injectable()
export class Location implements LocationInterface {
  getHref(): string {
    return utils.getHref();
  }

  getSearch(): SerializableQueryParams {
    const searchParams = new URLSearchParams(utils.getSearch());
    const serializableSearchParams: SerializableQueryParams = [];

    // URLSearchParams is a Iterable but TypeScript does not know about that.
    searchParams.forEach((value: string, key: string) => {
      serializableSearchParams.push({key, value});
    });

    return serializableSearchParams;
  }

  getHash(): string {
    return window.location.hash;
  }

  getPath(): string {
    return window.location.pathname;
  }

  getHistoryState() {
    return window.history.state;
  }

  replaceStateUrl(url: string): void {
    window.history.replaceState(window.history.state, '', url);
  }

  pushStateUrl(url: string): void {
    window.history.pushState(null, '', url);
  }

  replaceStateData(data: any) {
    window.history.replaceState(data, '');
  }

  onPopState(): Observable<NavigationFromHistory> {
    return fromEvent<PopStateEvent>(window, 'popstate').pipe(
      map((e) => {
        return {
          pathname: this.getPath(),
          state: e.state,
        };
      })
    );
  }

  /**
   * Converts a relative path to an absolute path.
   */
  getResolvedPath(relativePath: string): string {
    const url = new URL(relativePath, utils.getHref());
    return url.pathname;
  }

  getFullPath(
    pathname: string,
    queryParams: SerializableQueryParams,
    shouldPreserveHash?: boolean
  ): string {
    const resolvedPathname = this.getResolvedPath(pathname);
    let search = '';
    if (queryParams.length) {
      search =
        '?' +
        createURLSearchParamsFromSerializableQueryParams(
          queryParams
        ).toString();
    }
    const hash = shouldPreserveHash ? this.getHash() : '';
    return `${resolvedPathname}${search}${hash}`;
  }
}

export const TEST_ONLY = {
  utils,
};
