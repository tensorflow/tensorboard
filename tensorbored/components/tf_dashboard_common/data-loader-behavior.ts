/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
import * as _ from 'lodash';
import {Canceller, CancelResult} from '../tf_backend/canceller';

type CacheKey = string;

// NOT_LOADED is implicit
export enum LoadState {
  LOADING,
  LOADED,
}

export interface DataLoaderBehaviorInterface<Item, Data>
  extends PolymerElement {
  active: boolean;
  reset(): void;
  reload(): void;
  dataToLoad: Item[];
}

// A function that takes a list of items and asynchronously fetches the
// data for those items. As each item loads, it should invoke the
// `onLoad` callback with an `{item, data}` pair to update the cache.
// After all items have finished loading, it should invoke the
// `onFinish` callback. Conceptually, that this function accepts
// `onLoad` and `onFinish` as arguments is as if it returned an
// Observable-style stream of `{item, data}`-pairs, CPS-transformed.
//
// Used in `DataLoaderBehavior.requestData`.
export interface RequestDataCallback<Item, Data> {
  (
    items: Item[],
    onLoad: (kv: {item: Item; data: Data}) => void,
    onFinish: () => void
  ): void;
}

export function DataLoaderBehavior<Item, Data>(
  superClass: new () => PolymerElement
): new () => DataLoaderBehaviorInterface<Item, Data> {
  return class DataLoaderBehaviorImpl<Item, Data>
    extends superClass
    implements DataLoaderBehaviorInterface<Item, Data>
  {
    active!: boolean;

    /**
     * A unique identifiable string. When changes, it expunges the data
     * cache.
     */
    loadKey = '';

    // List of items to be loaded. By default, items are passed to
    // `requestData` to fetch data. When the request resolves, invokes
    // `loadDataCallback` with the datum and its response.
    dataToLoad: Item[] = [];

    /**
     * A function that takes an item as an input and returns a unique
     * identifiable string. Used for caching purposes.
     */
    getDataLoadName = (item: Item): CacheKey => String(item);

    /**
     * A function that takes as inputs:
     * 1. Implementing component of data-loader-behavior.
     * 2. datum of the request.
     * 3. The response received from the data URL.
     * This function will be called when a response from a request to that
     * data URL is successfully received.
     */
    loadDataCallback!: (component: this, item: Item, data: Data) => void;

    // Function that actually loads data from the network. See docs on
    // `RequestDataCallback` for details.
    requestData: RequestDataCallback<Item, Data>;

    dataLoading = false;
    dataLoadedAtLeastOnce = false;

    // The standard Node.isConnected doesn't seem to be set reliably, so we
    // wire up our own property manually.
    _isConnected = false;

    connectedCallback() {
      super.connectedCallback();
      this._isConnected = true;
    }

    override disconnectedCallback() {
      super.disconnectedCallback();
      this._isConnected = false;
    }

    static get properties() {
      return {
        active: {
          type: Boolean,
          observer: '_loadDataIfActive',
        },
        _isConnected: {type: Boolean},
        loadKey: {type: String},
        dataToLoad: {type: Array},
        getDataLoadName: {type: Object},
        loadDataCallback: {type: Object},
        requestData: {type: Object},
      };
    }

    static get observers() {
      return ['_dataToLoadChanged(_isConnected, dataToLoad.*)'];
    }

    /*
     * A map of a cache key to LoadState. If a cacheKey does not exist in the
     * map, it is considered NOT_LOADED.
     * Invoking `reload` or a change in `loadKey` clears the cache.
     */

    _dataLoadState = new Map<CacheKey, LoadState>();

    _canceller = new Canceller();

    _loadDataAsync: null | number = null;

    _loadData = _.throttle(this._loadDataImpl, 100, {
      leading: true,
      trailing: true,
    });

    onLoadFinish() {
      // Override to do something useful.
    }

    reload() {
      this._dataLoadState.clear();
      this._loadData();
    }

    reset() {
      // https://github.com/tensorflow/tensorboard/issues/1499
      // Cannot use the observer to observe `loadKey` changes directly.
      if (this._loadDataAsync != null) {
        clearTimeout(this._loadDataAsync);
        this._loadDataAsync = null;
      }
      if (this._canceller) this._canceller.cancelAll();
      if (this._dataLoadState) this._dataLoadState.clear();
      if (this._isConnected) this._loadData();
    }

    _dataToLoadChanged() {
      if (this._isConnected) this._loadData();
    }

    detached() {
      // Note: Cannot call canceller.cancelAll since it will poison the cache.
      // detached gets called when a component gets unmounted from the document
      // but it can be re-mounted. When remounted, poisoned cache will manifest.
      // t=0: dataLoadState: 'a' = loading
      // t=10: unmount
      // t=20: request for 'a' resolves but we do not change the loadState
      // because we do not want to set one if, instead, it was resetted at t=10.
      if (this._loadDataAsync != null) {
        clearTimeout(this._loadDataAsync);
        this._loadDataAsync = null;
      }
    }
    _loadDataIfActive() {
      if (this.active) {
        this._loadData();
      }
    }
    _loadDataImpl() {
      if (!this.active) return;
      if (this._loadDataAsync !== null) clearTimeout(this._loadDataAsync);
      this._loadDataAsync = setTimeout(
        this._canceller.cancellable((result) => {
          if (result.cancelled) {
            return;
          }
          this.dataLoading = true;
          const dirtyItems = this.dataToLoad.filter((datum) => {
            const cacheKey = this.getDataLoadName(datum);
            return !this._dataLoadState.has(cacheKey);
          });
          for (const item of dirtyItems) {
            const cacheKey = this.getDataLoadName(item);
            this._dataLoadState.set(cacheKey, LoadState.LOADING);
          }
          const onLoad = this._canceller.cancellable(
            (result: CancelResult<{item: Item; data: Data}>) => {
              if (result.cancelled) {
                return;
              }
              const {item, data} = result.value;
              const cacheKey = this.getDataLoadName(item);
              this._dataLoadState.set(cacheKey, LoadState.LOADED);
              this.loadDataCallback(this, item, data);
            }
          );
          const onFinish = this._canceller.cancellable(
            (result: CancelResult<void>) => {
              // Only notify of data load if the load was not cancelled.
              if (!result.cancelled) {
                const keysFetched = result.value as any;
                const fetched = new Set(
                  dirtyItems.map((item) => this.getDataLoadName(item))
                );
                const shouldNotify = this.dataToLoad.some((datum) =>
                  fetched.has(this.getDataLoadName(datum))
                );
                if (shouldNotify) {
                  this.onLoadFinish();
                }
                this._loadDataAsync = null;
                this.dataLoadedAtLeastOnce = true;
              }
              const isDataFetchPending = Array.from(
                this._dataLoadState.values()
              ).includes(LoadState.LOADING);
              if (!isDataFetchPending) {
                this.dataLoading = false;
              }
            }
          );
          this.requestData(dirtyItems, onLoad, () => onFinish(undefined));
        })
      );
    }
  };
}
