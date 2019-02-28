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
namespace tf_dashboard_common {

/**
 * @polymerBehavior
 */
export const DataLoaderBehavior = {
  properties: {
    /**
     * A unique identifiable string. When changes, it expunges the data
     * cache.
     */
    loadKey: {
      type: String,
      value: '',
    },

    // List of data to be loaded. By default, a datum is passed to
    // `requestData` to fetch data. When the request resolves, invokes
    // `loadDataCallback` with the datum and its response.
    dataToLoad: {
      type: Array,
      value: () => []
    },

    /**
     * A function that takes a datum as an input and returns a unique
     * identifiable string. Used for caching purposes.
     */
    getDataLoadName: {
      type: Function,
      value: () => (datum) => String(datum),
    },

    /**
     * A function that takes as inputs:
     * 1. Implementing component of data-loader-behavior.
     * 2. datum of the request.
     * 3. The response received from the data URL.
     * This function will be called when a response from a request to that
     * data URL is successfully received.
     */
    loadDataCallback: Function,

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
    requestData: {
      type: Function,
      value: function() {
        return (datum) => this.requestManager.request(
          this.getDataLoadUrl(datum));
      },
    },

    // A function that takes a datum and returns a string URL for fetching
    // data.
    getDataLoadUrl: Function,

    dataLoading: {
      type: Boolean,
      readOnly: true,
      reflectToAttribute: true,
      value: false,
    },

    /*
     * A set of data that has been loaded the data already. This exists to
     * prevent fetching same data again.
     * Invoking `reload` or a change in `loadKey` clears the cache.
     */
    _loadedData: {
      type: Object,
      value: () => new Set(),
    },

    _canceller: {
      type: Object,
      value: () => new tf_backend.Canceller(),
    },

  },

  observers: [
    '_dataToLoadChanged(isAttached, dataToLoad.*)',
  ],

  onLoadFinish() {
    // Override to do something useful.
  },

  reload() {
    this._loadedData.clear();
    this._loadData();
  },

  reset() {
    // https://github.com/tensorflow/tensorboard/issues/1499
    // Cannot use the observer to observe `loadKey` changes directly.
    if (this._canceller) this._canceller.cancelAll();
    if (this._loadedData) this._loadedData.clear();
    if (this.isAttached) this._loadData();
  },

  _dataToLoadChanged() {
    if (this.isAttached) this._loadData();
  },

  created() {
    this._loadData = _.debounce(
        this._loadDataImpl,
        100,
        {leading: true, trailing: true});
  },

  detached() {
    this._canceller.cancelAll();
    this.cancelAsync(this._loadDataAsync);
  },

  _loadDataImpl() {
    this.cancelAsync(this._loadDataAsync);

    if (!this.isAttached) return;
    this._loadDataAsync = this.async(() => {
      // Read-only property have a special setter.
      this._setDataLoading(true);

      // Before updating, cancel any network-pending updates, to
      // prevent race conditions where older data stomps newer data.
      this._canceller.cancelAll();
      const promises = this.dataToLoad.filter(datum => {
        const name = this.getDataLoadName(datum);
        return !this._loadedData.has(name);
      }).map(datum => {
        const name = this.getDataLoadName(datum);
        const updateSeries = this._canceller.cancellable(result => {
          if (result.cancelled) return;
          this._loadedData.add(name);
          this.loadDataCallback(this, datum, result.value);
        });
        return this.requestData(datum).then(updateSeries);
      });

      return Promise.all(promises).then(this._canceller.cancellable(result => {
        // Read-only property have a special setter.
        this._setDataLoading(false);
        if (result.cancelled) return;
        this.onLoadFinish();
      }));
    });
  },
};

}  // namespace tf_dashboard_common
