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
import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property, computed} from '@polymer/decorators';

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
  value!: string;

  @computed('value')
  get _parts() {
    let {value} = this;
    const result = [];
    const delimiterPattern = /[/=_,-]/;
    if (value == null) {
      value = '';
    }
    while (true) {
      const idx = value.search(delimiterPattern);
      if (idx === -1) {
        result.push(value);
        break;
      } else {
        result.push(value.slice(0, idx + 1));
        value = value.slice(idx + 1);
      }
    }
    return result;
  }
}
