/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

import {computed, customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';

// tf-wbr-string safely renders a string, with <wbr> word break elements inserted
// after substrings that match a regular expression pattern.
@customElement('tf-wbr-string')
class TfWbrString extends PolymerElement {
  static readonly template = html`
    <!--
      This ugly formatting is required to prevent spaces from slipping
      into the HTML.
    -->
    <template is="dom-repeat" items="[[_parts]]" as="part"
      >[[part]]<wbr
    /></template>
  `;
  @property({type: String})
  value: string;

  /**
   * Regular expression pattern for specifying delimiters. <wbr> elements
   * are inserted after all nonoverlapping matches. A match that is
   * overlapped by another match further to the left is ignored. Empty
   * matches will consume the remainder of the string so it is advised
   * to not allow empty matches in your pattern.
   */
  @property({type: String})
  delimiterPattern: string;

  @computed('value', 'delimiterPattern')
  get _parts(): unknown[] {
    var value = this.value;
    var delimiterPattern = this.delimiterPattern;
    const result: string[] = [];
    while (true) {
      const delimiterRegExp = new RegExp(delimiterPattern, 'g');
      delimiterRegExp.test(value);
      if (delimiterRegExp.lastIndex === 0) {
        result.push(value);
        break;
      } else {
        result.push(value.slice(0, delimiterRegExp.lastIndex));
        value = value.slice(delimiterRegExp.lastIndex);
      }
    }
    return result;
  }
}
