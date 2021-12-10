/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
import {observe, property} from '@polymer/decorators';
import {
  TemplateInstanceBase,
  templatize,
} from '@polymer/polymer/lib/utils/templatize';
import {ArrayUpdateHelper} from '../tf_dashboard_common/array-update-helper';

/**
 * The TfDomRepeatBehavior re-implements part of the dom-repeat template.
 * It can be applied to any Polymer components to make it dom-repeat-like.
 * The major discrepency is in syntax when using:
 *
 *   <template is="dom-repeat">
 *     ...
 *   </template>
 *   // versus
 *   <foo-comp>
 *     <template>
 *       ...
 *     </template>
 *   </foo-comp>
 *
 * When implementing the behavior, the Polymer component has to invoke
 * `this.updateDom(newItems)`. Other protected APIs are `setGetItemKey` and
 * `setCacheSize` (please see respective doc for details).
 */
export class TfDomRepeat<T extends {}> extends ArrayUpdateHelper {
  @property({type: String})
  as = 'item';

  @property({type: Array})
  items!: T[];

  /**
   * Whether all stamped items are active or not.
   * @protected
   */
  @property({type: Boolean})
  protected _contentActive: boolean = true;

  @property({type: Boolean})
  _domBootstrapped = false;

  @property({type: Object})
  _ctor: any = null;

  /**
   * A list of rendered and mounted items.
   */
  @property({type: Array})
  _renderedItems: T[] = [];

  /**
   * A map of stamped child components.
   */
  @property({type: Object})
  _renderedTemplateInst = new Map<string, TemplateInstanceBase>();

  /**
   * When item is removed, it is placed in a cache and the oldest item gets
   * removed when LRU grows more than size of the 2x_limit.
   */
  @property({type: Object})
  _lruCachedItems = new Map<any, any>();

  @property({type: Number})
  _cacheSize = 10;

  @property({type: Object})
  _getItemKey = (item: T) => JSON.stringify(item);

  @property({type: Boolean})
  _isConnected = false;

  connectedCallback() {
    super.connectedCallback();
    this._isConnected = true;
  }

  /**
   * Sets the size of the DOM cache used for optimizing performance. The
   * default cache size is 10.
   */
  setCacheSize(size: number) {
    this._cacheSize = size;
  }

  /**
   * Sets getItemKey, a function that requires a unique identifier for an
   * item. It is used to optimize performance of redraws. The default is
   * JSON.stringify(item).
   */
  setGetItemKey(getItemKey: (item: T) => string) {
    this._getItemKey = getItemKey;
  }

  /**
   * Updates DOM to reflect changes in `items`.
   */
  updateDom(items: T[]) {
    this.updateArrayProp('_renderedItems', items, this._getItemKey);
  }

  _ensureTemplatized() {
    // Polymer is not ready (and props/DOM for the components are not
    // populated)
    if (!this.isConnected) return false;
    if (!this._ctor) {
      const templateNode = this.querySelector('template');
      this._ctor = templatize(templateNode!, this, {
        parentModel: true,
        instanceProps: {
          [this.as]: true,
          active: this._contentActive,
        },
        forwardHostProp: function (prop: string, value: any) {
          this._renderedTemplateInst.forEach((inst: TemplateInstanceBase) => {
            inst.forwardHostProp(prop, value);
          });
        },
      });
    }
    return true;
  }

  @observe('_isConnected')
  _bootstrapDom() {
    if (!this._ensureTemplatized() || this._domBootstrapped) {
      return;
    }

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element) {
              node.setAttribute('slot', 'items');
            }
          }
        }
      }
    });
    observer.observe(this, {childList: true});

    Array.from(this.children).forEach((child) => {
      this.removeChild(child);
    });
    this._lruCachedItems.clear();
    this._renderedItems.forEach((item, index) => this._insertItem(item, index));
    this._domBootstrapped = true;
  }

  @observe('_contentActive')
  _updateActive() {
    if (!this._domBootstrapped) return;
    Array.from(this._renderedTemplateInst.values()).forEach((inst) => {
      inst.notifyPath('active', this._contentActive);
    });
  }

  @observe('_renderedItems.*', '_domBootstrapped')
  _updateDom(
    event: any // PolymerDeepPropertyChange<T, PolymerSpliceChange<T[]>>
  ) {
    if (!this._domBootstrapped) return;
    // These are uninteresting.
    if (
      event.path == '_renderedItems' ||
      event.path == '_renderedItems.length'
    ) {
      return;
    }
    if (event.path === '_renderedItems.splices') {
      const value = event.value as any; // PolymerSpliceChange<T[]>;
      value.indexSplices.forEach((splice) => {
        const {index, addedCount, object, removed} = splice;
        removed.forEach((item) => {
          this._removeItem(item, this.children[index]);
        });
        object
          .slice(index, index + addedCount)
          .forEach((item, ind) => this._insertItem(item, index + ind));
        this._trimCache();
      });
    } else {
      // Update the stamped and mounted DOM model by notifying.
      const key = this._getItemKey(event.value as T);
      if (this._renderedTemplateInst.has(key)) {
        this._renderedTemplateInst.get(key)!.notifyPath(this.as, event.value);
      } else {
        console.warn(
          `Expected '${key}' to exist in the DOM but ` + `could not find one.`
        );
      }
    }
  }

  _insertItem(item: T, atIndex: number) {
    if (!this._ensureTemplatized()) {
      throw new Error('Expected templatized before inserting an item');
    }
    let fragOrEl;
    const key = this._getItemKey(item);
    if (this._lruCachedItems.has(key)) {
      fragOrEl = this._lruCachedItems.get(key);
      this._lruCachedItems.delete(key);
      this._renderedTemplateInst
        .get(key)!
        .notifyPath('active', this._contentActive);
    } else {
      const prop = {[this.as]: item, active: this._contentActive};
      const inst = new this._ctor!(prop);
      fragOrEl = inst.root;
      this._renderedTemplateInst.set(key, inst);
    }
    if (this.children[atIndex]) {
      this.insertBefore(fragOrEl, this.children[atIndex]);
    } else {
      const els =
        fragOrEl.nodeType == Node.DOCUMENT_FRAGMENT_NODE
          ? Array.from(fragOrEl.children)
          : [fragOrEl];
      els.forEach((el: Element) => el.setAttribute('slot', 'items'));
      this.appendChild(fragOrEl);
    }
  }

  _removeItem(item: T, node: Node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    const key = this._getItemKey(item);
    this._lruCachedItems.set(key, node);
    this._renderedTemplateInst.get(key)!.notifyPath('active', false);
  }

  @observe('_cacheSize')
  _trimCache() {
    while (this._lruCachedItems.size > this._cacheSize) {
      const [firstKey] = this._lruCachedItems.keys();
      this._lruCachedItems.delete(firstKey);
      this._renderedTemplateInst.delete(firstKey);
    }
  }
}
