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
import '../polymer/irons_and_papers';
import '../tf_markdown_view/tf-markdown-view';
import './tf-card-heading-style';
import {pickTextColor} from './util';

/**
 * A compact heading to appear above a single visualization, summarizing
 * the metadata about a tag or run-tag combination.
 *
 * Properties (all optional):
 *   - `displayName`, `tag`, and `description` are properties from the
 *     relevant Summary protobuf.
 *   - `run` is the name of the TensorFlow run, if applicable.
 *   - `color` can be set to display a colored border at the left of the
 *     card; if left unset, no border will be displayed.
 *   - Any children of this component will be rendered below the above
 *     information, and can be used to display (for example) some small
 *     control widgets.
 */
@customElement('tf-card-heading')
class TfCardHeading extends PolymerElement {
  static readonly template = html`
    <div class="container">
      <figcaption class="content">
        <div class="heading-row">
          <template is="dom-if" if="[[_nameLabel]]">
            <div itemprop="name" class="heading-label name">[[_nameLabel]]</div>
          </template>
          <template is="dom-if" if="[[run]]">
            <!-- Extra wrapping span needed to avoid flexbox blockification. -->
            <!-- (see flexbox spec, section 4 "Flex Items") -->
            <span>
              <span
                itemprop="run"
                id="heading-run"
                class="heading-label heading-right run"
                >[[run]]</span
              >
            </span>
          </template>
        </div>
        <template is="dom-if" if="[[_tagLabel]]">
          <div class="heading-row">
            <div class="heading-label">
              tag: <span itemprop="tag">[[_tagLabel]]</span>
            </div>
          </div>
        </template>
        <slot></slot>
      </figcaption>
      <template is="dom-if" if="[[description]]">
        <paper-icon-button
          icon="info"
          on-tap="_toggleDescriptionDialog"
          title="Show summary description"
        ></paper-icon-button>
      </template>
      <paper-dialog
        id="descriptionDialog"
        no-overlap=""
        horizontal-align="auto"
        vertical-align="auto"
      >
        <paper-dialog-scrollable>
          <tf-markdown-view html="[[description]]"></tf-markdown-view>
        </paper-dialog-scrollable>
      </paper-dialog>
    </div>
    <style include="tf-card-heading-style">
      .container {
        display: flex;
      }
      .content {
        font-size: 12px;
        flex-grow: 1;
      }
      .name {
        font-size: 14px;
      }
      .run {
        font-size: 11px;
        width: auto;
        border-radius: 3px;
        font-weight: bold;
        padding: 1px 4px 2px;
      }
      paper-icon-button {
        flex-grow: 0;
      }
      paper-dialog-scrollable {
        max-width: 640px;
      }
      #heading-run {
        background: var(--tf-card-heading-background-color);
        color: var(--tf-card-heading-color);
      }
    </style>
  `;

  @property({type: String}) displayName: string | null = null;

  @property({type: String}) tag: string | null = null;

  @property({type: String}) run: string | null = null;

  @property({type: String}) description: string | null = null;

  @property({type: String}) color: string | null = null;

  @property({
    type: String,
    computed: '_computeRunBackground(color)',
    readOnly: true,
    observer: '_updateHeadingStyle',
  })
  _runBackground: string;

  @property({
    type: String,
    computed: '_computeRunColor(color)',
    readOnly: true,
    observer: '_updateHeadingStyle',
  })
  _runColor: string;

  _updateHeadingStyle() {
    this.updateStyles({
      '--tf-card-heading-background-color': this._runBackground,
      '--tf-card-heading-color': this._runColor,
    });
  }
  _computeRunBackground(color) {
    return color || 'none';
  }
  _computeRunColor(color) {
    return pickTextColor(color);
  }

  @computed('displayName', 'tag')
  get _nameLabel(): string {
    var displayName = this.displayName;
    var tag = this.tag;
    return displayName || tag || '';
  }

  @computed('displayName', 'tag')
  get _tagLabel(): string {
    var displayName = this.displayName;
    var tag = this.tag;
    return tag && tag !== displayName ? tag : '';
  }

  _toggleDescriptionDialog(e) {
    const dialog = this.$.descriptionDialog as any;
    dialog.positionTarget = e.target;
    dialog.toggle();
  }
}
