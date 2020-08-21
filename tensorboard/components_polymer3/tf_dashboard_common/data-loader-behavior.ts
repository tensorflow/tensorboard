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

import {CancelResult, Canceller} from '../tf_backend/canceller';
import {RequestManager} from '../tf_backend/requestManager';

type CacheKey = string;

// NOT_LOADED is implicit
export enum LoadState {
  LOADING,
  LOADED,
}

export interface DataLoaderBehaviorInterface<K, V> extends PolymerElement {
  active: boolean;
  reset(): void;
  reload(): void;
  keysToLoad: K[];
}

// A function that takes a list of keys and asynchronously fetches the
// corresponding values. As each item loads, it should invoke the
// `onLoad` callback with a `{key, value}` pair to update the cache.
// After all data has finished loading, it should invoke the
// `onFinish` callback. Conceptually, that this function accepts
// `onLoad` and `onFinish` as arguments is as if it returned an
// Observable-style stream of `{key, value}`-pairs, CPS-transformed.
//
// Used in `DataLoaderBehavior.requestData`.
export interface RequestDataCallback<K, V> {
  (
    keys: K[],
    onLoad: (kv: {key: K; value: V}) => void,
    onFinish: () => void
  ): void;
}

export function DataLoaderBehavior<K, V>(
  superClass: new () => PolymerElement
): new () => DataLoaderBehaviorInterface<K, V> {
  return class DataLoaderBehaviorImpl<K, V> extends superClass
    implements DataLoaderBehaviorInterface<K, V> {
    active!: boolean;

    /**
     * A unique identifiable string. When changes, it expunges the data
     * cache.
     */
    loadKey = '';

    // List of keys to be loaded. Keys are passed to `requestData` to
    // fetch data. When the data is loaded, `loadDataCallback` is
    // invoked with the key-value pairs.
    keysToLoad: K[] = [];

    /**
     * A function that takes a key as an input and returns a unique
     * identifiable string. Used for caching purposes.
     */
    getCacheKey = (key: K): CacheKey => String(key);

    /**
     * A function that takes as inputs:
     * 1. Implementing component of data-loader-behavior.
     * 2. A key that was requested.
     * 3. The corresponding value that was loaded.
     */
    loadDataCallback!: (component: this, key: K, value: V) => void;

    // Function that actually loads data from the network. See docs on
    // `RequestDataCallback` for details.
    requestData: RequestDataCallback<K, V>;

    dataLoading = false;

    // The standard Node.isConnected doesn't seem to be set reliably, so we
    // wire up our own property manually.
    _isConnected = false;

    connectedCallback() {
      super.connectedCallback();
      this._isConnected = true;
    }

    disconnectedCallback() {
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
        keysToLoad: {type: Array},
        getCacheKey: {type: Object},
        loadDataCallback: {type: Object},
        requestData: {type: Object},
      };
    }

    static get observers() {
      return ['_keysToLoadChanged(_isConnected, keysToLoad.*)'];
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

    _keysToLoadChanged() {
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
          const dirtyKeys = this.keysToLoad.filter((datum) => {
            const cacheKey = this.getCacheKey(datum);
            return !this._dataLoadState.has(cacheKey);
          });
          for (const key of dirtyKeys) {
            const cacheKey = this.getCacheKey(key);
            this._dataLoadState.set(cacheKey, LoadState.LOADING);
          }
          const onLoad = this._canceller.cancellable(
            (result: CancelResult<{key: K; value: V}>) => {
              if (result.cancelled) {
                return;
              }
              const {key, value} = result.value;
              const cacheKey = this.getCacheKey(key);
              this._dataLoadState.set(cacheKey, LoadState.LOADED);
              this.loadDataCallback(this, key, value);
            }
          );
          const onFinish = this._canceller.cancellable(
            (result: CancelResult<void>) => {
              // Only notify of data load if the load was not cancelled.
              if (!result.cancelled) {
                const keysFetched = result.value as any;
                const fetched = new Set(
                  dirtyKeys.map((k) => this.getCacheKey(k))
                );
                const shouldNotify = this.keysToLoad.some((k) =>
                  fetched.has(this.getCacheKey(k))
                );
                if (shouldNotify) {
                  this.onLoadFinish();
                }
                this._loadDataAsync = null;
              }
              const isDataFetchPending = Array.from(
                this._dataLoadState.values()
              ).includes(LoadState.LOADING);
              if (!isDataFetchPending) {
                this.dataLoading = false;
              }
            }
          );
          this.requestData(dirtyKeys, onLoad, () => onFinish(undefined));
        })
      );
    }
  };
}
