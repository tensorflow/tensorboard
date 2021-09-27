/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

import {PolymerElement} from '@polymer/polymer';

/**
 * Polymer mixin replacement for `:host-context(body.dark-mode)`.
 *-
 * Unfortunately, Firefox does not support `:host-context()` and cannot use the
 * WebComponent way of styling shadow DOMs with context for ancestor [1][2].
 * To work around the issue, we are creating a WebComponent mixin that adds
 * class `dark-mode` to `:host` when body contains the class, `.dark-mode`.
 *
 * Unfortunately, due to our infamiliarity with mixins, our types are imperfect.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/:host-context()
 * [2]: https://bugzilla.mozilla.org/show_bug.cgi?id=1082060
 */
export function DarkModeMixin<T extends PolymerElement>(
  Base: new () => PolymerElement
): new () => T {
  return class Foo extends Base {
    private observer?: MutationObserver;

    override connectedCallback() {
      super.connectedCallback();
      this._maybeSetDarkMode();

      this.observer = new MutationObserver((mutations) => {
        const classChanged = mutations.some((mutation) => {
          return mutation.attributeName === 'class';
        });
        if (classChanged) this._maybeSetDarkMode();
      });
      this.observer.observe(document.body, {attributes: true});
    }

    override disconnectedCallback() {
      super.disconnectedCallback();
      this.observer?.disconnect();
    }

    private _maybeSetDarkMode() {
      this.classList.toggle(
        'dark-mode',
        document.body.classList.contains('dark-mode')
      );
    }
  } as unknown as new () => T;
}
