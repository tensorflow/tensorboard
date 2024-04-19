/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import {sanitize} from './sanitize';

// tf-markdown-view renders raw HTML that has been converted from
// Markdown by some other agent. The HTML must be sanitized, and must be
// safe to inject directly into the DOM.

// TensorBoard plugins can use the `markdown_to_safe_html` function from
// the `tensorboard.plugin_util` module on the backend to generate HTML
// suitable for use with this component.
@customElement('tf-markdown-view')
class TfMarkdownView extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="markdown" inner-h-t-m-l="[[sanitizedHtml]]"></div>
    <style>
      /*
       * Reduce topmost and bottommost margins from 16px to 0.3em (renders
       * at about 4.8px) to keep the layout compact. This improves the
       * appearance when there is only one line of text; standard Markdown
       * renderers will still include a \`<p>\` element.
       *
       * By targeting only the top-level, extremal elements, we preserve any
       * actual paragraph breaks and only change the padding against the
       * component edges.
       */
      #markdown > p:first-child {
        margin-top: 0.3em;
      }
      #markdown > p:last-child {
        margin-bottom: 0.3em;
      }
      #markdown p {
        /* Some users include multiple spaces and would like them preserved in
         * the text visualization in TB. Googlers, see b/335770352.
         */
        white-space: break-spaces;
      }

      /* Pleasant styles for Markdown tables. */
      #markdown table {
        border-collapse: collapse;
      }
      #markdown table th {
        font-weight: 600;
      }
      #markdown table th,
      #markdown table td {
        padding: 6px 13px;
        border: 1px solid var(--tb-ui-border, #dfe2e5);
      }
      #markdown table tr {
        background-color: inherit;
        border-top: 1px solid var(--tb-ui-border, #c6cbd1);
      }
    </style>
  `;
  @property({
    type: String,
  })
  html: string = '';

  @computed('html')
  get sanitizedHtml() {
    return sanitize(this.html);
  }

  override attached() {
    window.requestAnimationFrame(() => {
      this.scopeSubtree(this.$.markdown, /*shouldObserve=*/ true);
    });
  }
}
