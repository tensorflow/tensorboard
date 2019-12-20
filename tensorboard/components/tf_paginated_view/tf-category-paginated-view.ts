/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
import {html} from '@polymer/polymer';
import {DomIf} from '@polymer/polymer/lib/elements/dom-if';
import {customElement, property, computed, observe} from '@polymer/decorators';
import '@polymer/iron-icon';
import '@polymer/iron-collapse';
import '@polymer/paper-button';
import '@polymer/paper-input';
import {
  Category,
  CategoryType,
} from '../tf_categorization_utils/categorizationUtils';
import {TfDomRepeat} from './tf-dom-repeat';
import {
  addLimitListener,
  removeLimitListener,
  getLimit,
} from './paginatedViewStore';

@customElement('tf-category-paginated-view')
class TfCategoryPaginatedView<CategoryItem> extends TfDomRepeat<CategoryItem> {
  static readonly template = html`
    <template is="dom-if" if="[[_paneRendered]]" id="ifRendered">
      <button class="heading" on-tap="_togglePane" open-button$="[[opened]]">
        <span class="name">
          <template is="dom-if" if="[[_isSearchResults]]">
            <template is="dom-if" if="[[_isCompositeSearch(category)]]">
              <span>Tags matching multiple experiments</span>
              <template is="dom-if" if="[[_isInvalidSearchResults]]">
                <span
                  >&nbsp;<strong>(malformed regular expression)</strong></span
                >
              </template>
            </template>
            <template is="dom-if" if="[[!_isCompositeSearch(category)]]">
              <span class="light">Tags matching /</span>
              <span class="category-name" title$="[[category.name]]"
                >[[category.name]]</span
              >
              <span class="light">/</span>
              <template is="dom-if" if="[[_isUniversalSearchQuery]]">
                <span> (all tags)</span>
              </template>
              <template is="dom-if" if="[[_isInvalidSearchResults]]">
                <span> <strong>(malformed regular expression)</strong></span>
              </template>
            </template>
          </template>
          <template is="dom-if" if="[[!_isSearchResults]]">
            <span class="category-name" title$="[[category.name]]"
              >[[category.name]]</span
            >
          </template>
        </span>
        <span class="count">
          <template is="dom-if" if="[[_hasMultiple]]">
            <span>[[_count]]</span>
          </template>
          <iron-icon icon="expand-more" class="expand-arrow"></iron-icon>
        </span>
      </button>
      <!-- TODO(stephanwlee): investigate further. For some reason,
        transitionend that the iron-collapse relies on sometimes does not
        trigger when rendering a chart with a spinner. A toy example cannot
        reproduce this bug. -->
      <iron-collapse opened="[[opened]]" no-animation="">
        <div class="content">
          <span id="top-of-container"></span>
          <template is="dom-if" if="[[_multiplePagesExist]]">
            <div class="big-page-buttons" style="margin-bottom: 10px;">
              <paper-button
                on-tap="_performPreviousPage"
                disabled$="[[!_hasPreviousPage]]"
                >Previous page</paper-button
              >
              <paper-button
                on-tap="_performNextPage"
                disabled$="[[!_hasNextPage]]"
                >Next page</paper-button
              >
            </div>
          </template>

          <div id="items">
            <slot name="items"></slot>
          </div>
          <template is="dom-if" if="[[_multiplePagesExist]]">
            <div id="controls-container">
              <div style="display: inline-block; padding: 0 5px">
                Page
                <paper-input
                  id="page-input"
                  type="number"
                  no-label-float=""
                  min="1"
                  max="[[_pageCount]]"
                  value="[[_pageInputValue]]"
                  on-input="_handlePageInputEvent"
                  on-change="_handlePageChangeEvent"
                  on-focus="_handlePageFocusEvent"
                  on-blur="_handlePageBlurEvent"
                ></paper-input>
                of [[_pageCount]]
              </div>
            </div>

            <div class="big-page-buttons" style="margin-top: 10px;">
              <paper-button
                on-tap="_performPreviousPage"
                disabled$="[[!_hasPreviousPage]]"
                >Previous page</paper-button
              >
              <paper-button
                on-tap="_performNextPage"
                disabled$="[[!_hasNextPage]]"
                >Next page</paper-button
              >
            </div>
          </template>
        </div>
      </iron-collapse>
    </template>
    <style>
      :host {
        display: block;
        margin: 0 5px 1px 10px;
      }

      :host(:first-of-type) {
        margin-top: 10px;
      }

      :host(:last-of-type) {
        margin-bottom: 20px;
      }

      .heading {
        background-color: white;
        border: none;
        cursor: pointer;
        width: 100%;
        font-size: 15px;
        line-height: 1;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
        padding: 10px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .heading::-moz-focus-inner {
        padding: 10px 15px;
      }

      [open-button] {
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
      }

      [open-button] .expand-arrow {
        transform: rotateZ(180deg);
      }

      .name {
        display: inline-flex;
        overflow: hidden;
      }

      .light {
        color: var(--paper-grey-500);
      }

      .category-name {
        white-space: pre;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 2px 0;
      }

      .count {
        margin: 0 5px;
        font-size: 12px;
        color: var(--paper-grey-500);
        display: flex;
        align-items: center;
        flex: none;
      }

      .heading::-moz-focus-inner {
        padding: 10px 15px;
      }

      .content {
        display: flex;
        flex-direction: column;
        background: white;
        border-bottom-left-radius: 2px;
        border-bottom-right-radius: 2px;
        border-top: none;
        border: 1px solid #dedede;
        padding: 15px;
      }

      .light {
        color: var(--paper-grey-500);
      }

      #controls-container {
        justify-content: center;
        display: flex;
        flex-direction: row;
        flex-grow: 0;
        flex-shrink: 0;
        width: 100%;
      }

      #controls-container paper-button {
        display: inline-block;
      }

      .big-page-buttons {
        display: flex;
      }

      .big-page-buttons paper-button {
        background-color: var(--tb-ui-light-accent);
        color: var(--tb-ui-dark-accent);
        display: inline-block;
        flex-basis: 0;
        flex-grow: 1;
        flex-shrink: 1;
        font-size: 13px;
      }

      .big-page-buttons paper-button[disabled] {
        background: none;
      }

      slot {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }

      #page-input {
        display: inline-block;
        width: var(--tf-category-paginated-view-page-input-width, 100%);
      }
    </style>
  `;

  @property({type: Object})
  category!: Category<CategoryItem>;

  @property({type: Boolean})
  initialOpened: boolean | null = null;

  @property({
    type: Boolean,
    notify: true,
  })
  opened: boolean = false;

  @property({
    type: Boolean,
  })
  disablePagination: boolean = false;

  @property({
    type: Object,
    observer: '_getCategoryItemKeyChanged',
  })
  getCategoryItemKey = (item: CategoryItem) => JSON.stringify(item);

  @property({
    type: Number,
    observer: '_limitChanged',
  })
  _limit: number = 12;

  @property({
    type: Number,
  })
  _activeIndex: number = 0;

  @property({
    type: String,
  })
  _pageInputRawValue: string = '';

  @property({
    type: Boolean,
  })
  _pageInputFocused: boolean = false;

  @computed('opened')
  get _contentActive() {
    return this.opened;
  }

  @property({
    type: Number,
    computed: '_computeCount(category.items.*)',
  })
  _count: number = 0;

  get _computeCount(): number {
    return this.category.items.length;
  }

  @computed('_count')
  get _hasMultiple(): boolean {
    return this._count > 1;
  }

  @property({
    type: Boolean,
    computed: '_computePaneRendered(category)',
    observer: '_onPaneRenderedChanged',
  })
  _paneRendered: boolean = false;

  _computePaneRendered() {
    const {category} = this;
    // Show a category unless it's a search results category where
    // there wasn't actually a search query.
    return !(
      category.metadata.type === CategoryType.SEARCH_RESULTS &&
      category.name === ''
    );
  }

  @computed('opened', '_paneRendered')
  get _itemsRendered(): boolean {
    return this._paneRendered && this.opened;
  }

  @property({
    type: Boolean,
    computed: '_computeIsSearchResults(category.metadata.type)',
  })
  _isSearchResults?: boolean;

  get _computeIsSearchResults() {
    return this.category.metadata.type === CategoryType.SEARCH_RESULTS;
  }

  @property({
    type: Boolean,
    computed: '_computeIsInvalidSearchResults(category.metadata)',
  })
  _isInvalidSearchResults?: boolean;

  get _computeIsInvalidSearchResults() {
    const {metadata} = this.category;
    return (
      metadata.type === CategoryType.SEARCH_RESULTS && !metadata.validRegex
    );
  }

  @property({
    type: Boolean,
    computed: '_computeIsUniversalSearchQuery(category.metadata)',
  })
  _isUniversalSearchQuery?: boolean;

  get _computeIsUniversalSearchQuery(): boolean {
    const {metadata} = this.category;
    return (
      metadata.type === CategoryType.SEARCH_RESULTS && metadata.universalRegex
    );
  }

  @computed('_limit', '_activeIndex')
  get _currentPage(): number {
    const {_activeIndex, _limit} = this;
    return Math.floor(_activeIndex / _limit) + 1;
  }

  @property({
    type: Number,
    computed: '_computePageCount(category.items.*, _limit)',
  })
  _pageCount: number = 0;

  get _computePageCount(): number {
    return this.category
      ? Math.ceil(this.category.items.length / this._limit)
      : 0;
  }

  @computed('_pageCount', 'disablePagination')
  get _multiplePagesExist(): boolean {
    return !this.disablePagination && this._pageCount > 1;
  }

  @computed('_currentPage')
  get _hasPreviousPage(): boolean {
    return this._currentPage > 1;
  }

  @computed('_currentPage', '_pageCount')
  get _hasNextPage(): boolean {
    return this._currentPage < this._pageCount;
  }

  @computed('_pageCount')
  get _inputWidth(): string {
    // Add 20px for the +/- arrows added by browsers.
    return `calc(${this._pageCount.toString().length}em + 20px)`;
  }

  @computed('_pageInputFocused', '_pageInputRawValue', '_currentPage')
  get _pageInputValue(): string {
    return this._pageInputFocused
      ? this._pageInputRawValue
      : this._currentPage.toString();
  }

  _togglePane() {
    this.opened = !this.opened;
  }

  _onPaneRenderedChanged(newRendered: boolean, oldRendered: boolean) {
    if (newRendered && newRendered !== oldRendered) {
      // Force dom-if render without waiting for one rAF.
      (this.$.ifRendered as DomIf).render();
    }
  }

  _isCompositeSearch(): boolean {
    const {metadata} = this.category;
    return (
      metadata.type === CategoryType.SEARCH_RESULTS &&
      Boolean(metadata.compositeSearch)
    );
  }

  private _limitListener: null | (() => void) = null;

  ready() {
    this.opened = this.initialOpened == null ? true : this.initialOpened;
    this._limitListener = () => {
      this.set('_limit', getLimit());
    };
    addLimitListener(this._limitListener);
    this._limitListener();
  }
  detached() {
    if (this._limitListener !== null) removeLimitListener(this._limitListener);
  }

  @observe(
    '_itemsRendered',
    'category.items.*',
    '_limit',
    '_activeIndex',
    '_pageCount',
    'disablePagination'
  )
  _updateRenderedItems() {
    const {
      _itemsRendered: itemsRendered,
      _limit: limit,
      _activeIndex: activeIndex,
      disablePagination,
    } = this;
    if (!itemsRendered) return;
    const activePageIndex = Math.floor(activeIndex / limit);
    const items = this.category.items || [];
    const domItems = disablePagination
      ? items
      : items.slice(activePageIndex * limit, (activePageIndex + 1) * limit);
    this.updateDom(domItems);
  }

  _limitChanged(limit: number) {
    this.setCacheSize(limit * 2);
  }

  _getCategoryItemKeyChanged() {
    this.setGetItemKey(this.getCategoryItemKey);
  }

  /**
   * Update _activeIndex, maintaining its range invariant.
   */
  _setActiveIndex(index: number) {
    const maxIndex = (this.category.items || []).length - 1;
    if (index > maxIndex) {
      index = maxIndex;
    }
    if (index < 0) {
      index = 0;
    }
    this.set('_activeIndex', index);
  }

  @observe('category.items.*')
  _clampActiveIndex() {
    this._setActiveIndex(this._activeIndex);
  }
  _performPreviousPage() {
    this._setActiveIndex(this._activeIndex - this._limit);
  }
  _performNextPage() {
    this._setActiveIndex(this._activeIndex + this._limit);
  }

  _handlePageInputEvent(e: KeyboardEvent) {
    const input = e.target as HTMLInputElement;
    this.set('_pageInputRawValue', input.value);
    const oneIndexedPage = input.valueAsNumber;
    if (isNaN(oneIndexedPage)) return;
    const page = Math.max(1, Math.min(oneIndexedPage, this._pageCount)) - 1;
    this._setActiveIndex(this._limit * page);
  }
  _handlePageChangeEvent() {
    // Occurs on Enter, etc. Commit the true state.
    this.set('_pageInputRawValue', this._currentPage.toString());
  }
  _handlePageFocusEvent() {
    // Discard any old (or uninitialized) state before we grant focus.
    this.set('_pageInputRawValue', this._pageInputValue);
    this.set('_pageInputFocused', true);
  }
  _handlePageBlurEvent() {
    this.set('_pageInputFocused', false);
  }

  @observe('_pageInputValue')
  _updatePageInputValue() {
    // Force two-way binding.
    const pageInput = this.$$('#page-input input') as HTMLInputElement | null;
    if (pageInput) {
      pageInput.value = this._pageInputValue;
    }
  }
  _updateInputWidth() {
    this.updateStyles({
      '--tf-category-paginated-view-page-input-width': this._inputWidth,
    });
  }
}
