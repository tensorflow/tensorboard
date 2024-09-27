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
import {Directive, HostBinding, HostListener, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../app_state';
import {navigationRequested} from '../actions';
import {AppRootProvider} from '../app_root';
import {Location} from '../location';

@Directive({
  standalone: false,
  selector: 'a[routerLink]',
})
export class RouterLinkDirectiveContainer {
  private pathname: string | null = null;

  constructor(
    private readonly store: Store<State>,
    private readonly location: Location,
    private readonly appRootProvider: AppRootProvider
  ) {}

  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent) {
    if (!this.pathname || event.ctrlKey || event.metaKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.store.dispatch(
      navigationRequested({
        pathname: this.pathname,
        resetNamespacedState: this.resetNamespacedState,
      })
    );
  }

  @HostBinding('attr.href')
  get href() {
    if (!this.pathname) return null;
    return this.appRootProvider.getAbsPathnameWithAppRoot(
      this.location.getResolvedPath(this.pathname)
    );
  }

  /**
   * Add pathname to a route.
   *
   * Unlike @angular/router's `routerLink`, the path is made sure to end  with
   * "/".
   * e.g., <a [routerLink]="['foo', someParamWithValueForBar]"> -> 'foo/bar/'.
   */
  @Input()
  set routerLink(pathParts: string[] | string) {
    if (typeof pathParts === 'string') {
      pathParts = [pathParts];
    }

    if (pathParts.length === 0) {
      throw new RangeError('routeLink should have proper path. Got nothing.');
    }

    // Append "/" suffix.
    const pathname = [...pathParts].join('/');
    this.pathname = pathname.endsWith('/') ? pathname : pathname + '/';
  }

  @Input() resetNamespacedState = false;
}
