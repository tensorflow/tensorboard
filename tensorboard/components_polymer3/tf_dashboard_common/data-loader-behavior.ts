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
import {property, observe} from '@polymer/decorators';
import * as _ from 'lodash';

import {dedupingMixin} from '../polymer/utils_mixin';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import {Canceller} from '../tf_backend/canceller';
import {RequestManager} from '../tf_backend/requestManager';

type CacheKey = string;
// NOT_LOADED is implicit
enum LoadState {
  LOADING,
  LOADED,
}

class DataLoader<Item, Data> extends LegacyElementMixin(PolymerElement) {
  @property({type: Boolean, observer: '_loadDataIfActive'})
  active!: boolean;

  /**
   * A unique identifiable string. When changes, it expunges the data
   * cache.
   */
  @property({type: String})
  loadKey = '';

  // List of data to be loaded. By default, a datum is passed to
  // `requestData` to fetch data. When the request resolves, invokes
  // `loadDataCallback` with the datum and its response.
  @property({type: Array})
  dataToLoad: Item[] = [];

  /**
   * A function that takes a datum as an input and returns a unique
   * identifiable string. Used for caching purposes.
   */
  @property({type: Object})
  getDataLoadName = (datum: Item): CacheKey => String(datum);

  /**
   * A function that takes as inputs:
   * 1. Implementing component of data-loader-behavior.
   * 2. datum of the request.
   * 3. The response received from the data URL.
   * This function will be called when a response from a request to that
   * data URL is successfully received.
   */
  @property({type: Object})
  loadDataCallback!: (component: this, datum: Item, data: Data) => void;

  public requestManager!: RequestManager;

  // A function that takes a datum as argument and makes the HTTP
  // request to fetch the data associated with the datum. It should return
  // a promise that either fullfills with the data or rejects with an error.
  // If the function doesn't bind 'this', then it will reference the element
  // that includes this behavior.
  // The default implementation calls this.requestManager.request with
  // the value returned by this.getDataLoadUrl(datum) (see below).
  // The only place getDataLoadUrl() is called is in the default
  // implementation of this method. So if you override this method with
  // an implementation that doesn't call getDataLoadUrl, it need not be
  // provided.
  @property({type: Object})
  requestData = (datum: Item) => {
    return this.requestManager.request(this.getDataLoadUrl(datum));
  };

  // A function that takes a datum and returns a string URL for fetching
  // data.
  @property({type: Object})
  getDataLoadUrl!: (datum: Item) => string;

  @property({type: Boolean, reflectToAttribute: true})
  dataLoading = false;

  /*
   * A map of a cache key to LoadState. If a cacheKey does not exist in the
   * map, it is considered NOT_LOADED.
   * Invoking `reload` or a change in `loadKey` clears the cache.
   */

  private _dataLoadState = new Map<CacheKey, LoadState>();

  private _canceller = new Canceller();

  private _loadDataAsync: null | number = null;

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
      this.cancelAsync(this._loadDataAsync);
      this._loadDataAsync = null;
    }
    if (this._canceller) this._canceller.cancelAll();
    if (this._dataLoadState) this._dataLoadState.clear();
    if (this.isAttached) this._loadData();
  }

  @observe('isAttached', 'dataToLoad.*')
  _dataToLoadChanged() {
    if (this.isAttached) this._loadData();
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
      this.cancelAsync(this._loadDataAsync);
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
    if (this._loadDataAsync !== null) this.cancelAsync(this._loadDataAsync);
    this._loadDataAsync = this.async(
      this._canceller.cancellable((result) => {
        if (result.cancelled) {
          return;
        }
        // Read-only property have a special setter.
        this.dataLoading = true;
        // Promises return cacheKeys of the data that were fetched.
        const promises = this.dataToLoad
          .filter((datum) => {
            const cacheKey = this.getDataLoadName(datum);
            return !this._dataLoadState.has(cacheKey);
          })
          .map((datum) => {
            const cacheKey = this.getDataLoadName(datum);
            this._dataLoadState.set(cacheKey, LoadState.LOADING);
            return this.requestData(datum).then(
              this._canceller.cancellable((result) => {
                // It was resetted. Do not notify of the response.
                if (!result.cancelled) {
                  this._dataLoadState.set(cacheKey, LoadState.LOADED);
                  this.loadDataCallback(this, datum, result.value as any);
                }
                return cacheKey;
              })
            );
          });
        return Promise.all(promises)
          .then(
            this._canceller.cancellable((result) => {
              // It was resetted. Do not notify of the data load.
              if (!result.cancelled) {
                const keysFetched = result.value as any;
                const fetched = new Set(keysFetched);
                const shouldNotify = this.dataToLoad.some((datum) =>
                  fetched.has(this.getDataLoadName(datum))
                );
                if (shouldNotify) {
                  this.onLoadFinish();
                }
              }
              const isDataFetchPending = Array.from(
                this._dataLoadState.values()
              ).some((loadState) => loadState === LoadState.LOADING);
              if (!isDataFetchPending) {
                // Read-only property have a special setter.
                this.dataLoading = false;
              }
            }),
            // TODO(stephanwlee): remove me when we can use  Promise.prototype.finally
            // instead
            () => {}
          )
          .then(
            this._canceller.cancellable(({cancelled}) => {
              if (cancelled) {
                return;
              }
              this._loadDataAsync = null;
            })
          );
      })
    );
  }
}

export const DataLoaderBehavior = dedupingMixin(() => DataLoader);
