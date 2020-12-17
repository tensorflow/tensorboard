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
import {InjectionToken, Provider} from '@angular/core';

import {Location} from './location';

/**
 * Provides web application root. The root path starts with `/` and always end with `/`.
 * In case of empty or missing tb-relative-root, it returns `/`.
 */
export const RESOLVED_APP_ROOT = new InjectionToken<string>(
  '[AppRouting] Resolved App Root'
);

export function metaElAppRootExtractor(location: Location): string {
  const metaEl = document.querySelector(
    'head meta[name="tb-relative-root"]'
  ) as HTMLMetaElement | null;

  if (!metaEl) return '/';
  const {pathname} = new URL(metaEl.content, location.getHref());
  return pathname.replace(/\/*$/, '/');
}

export const AppRootProvider: Provider = {
  provide: RESOLVED_APP_ROOT,
  useFactory: metaElAppRootExtractor,
  deps: [Location],
};
