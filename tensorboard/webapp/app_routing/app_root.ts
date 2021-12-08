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
import {Location} from './location';

@Injectable()
export class AppRootProvider {
  protected appRoot: string;

  constructor(location: Location) {
    this.appRoot = this.getAppRootFromMetaElement(location);
  }

  /**
   * appRoot path starts with `/` and always end with `/`.
   */
  private getAppRootFromMetaElement(location: Location): string {
    const metaEl = document.querySelector('head meta[name="tb-relative-root"]');

    if (!metaEl) return '/';
    const {pathname} = new URL(
      (metaEl as HTMLMetaElement).content,
      location.getHref()
    );
    return pathname.replace(/\/*$/, '/');
  }

  /**
   * Returns actual full pathname that includes path prefix of the application.
   */
  getAbsPathnameWithAppRoot(absPathname: string): string {
    // appRoot has trailing '/'. Remove one so we don't have "//".
    return this.appRoot.slice(0, -1) + absPathname;
  }

  getAppRootlessPathname(absPathname: string) {
    if (absPathname.startsWith(this.appRoot)) {
      // appRoot ends with "/" and we need the trimmed pathname to start with "/" since
      // routes are defined with starting "/".
      return '/' + absPathname.slice(this.appRoot.length);
    }
    return absPathname;
  }
}

@Injectable()
export class TestableAppRootProvider extends AppRootProvider {
  getAppRoot(): string {
    return this.appRoot;
  }

  setAppRoot(appRoot: string) {
    this.appRoot = appRoot;
  }
}
