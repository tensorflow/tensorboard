/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
/**
 * @fileoverview ArrayBufferProvider responsible for making requests to server,
 * receive and parse response.
 */
// TODO(b/135959734): this class must be refactored into base DataProvider and
// subclass ArrayBufferDataProvider later.

import {Canceller} from '../../../components/tf_backend/canceller';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';

/**
 * Types of errors during network data roundtrip.
 * @enum {number}
 */
export enum ErrorCodes {
  CANCELLED = 1, // Happens when the request was cancelled before it finished.
}
/**
 * Types of content displayed by the plugin.
 * @enum {number}
 */
export enum ContentType {
  VERTEX = 1,
  FACE = 2,
  COLOR = 3,
}
/**
 * Types of content displayed by the plugin mapped to underlying data types.
 * @enum {string}
 */
export enum ContentTypeToItemType {
  VERTEX = 'float32',
  FACE = 'int32',
  COLOR = 'uint8',
}

export class ArrayBufferDataProvider {
  private _requestManager: RequestManager;
  private _canceller = new Canceller();
  /**
   * ArrayBufferDataProvider constructor, initializes everything needed for
   * future requests to the server.
   * @param requestManager Request manager to communicate with the
   *  server.
   */
  constructor(requestManager: RequestManager) {
    this._requestManager = requestManager;
  }

  /**
   * Requests new data from the server.
   */
  reload(run, tag, sample) {
    this._canceller.cancelAll();
    return this._fetchMetadata(run, tag, sample);
  }

  /**
     * Requests new data of some particular type from the server.
     * @param {string} run Name of the run to get data for.
     * @param {string} tag Name of the tag to get data for.
     * @param {string} content_type Type of the content to retrieve.
     * @param {!array} metadata List of metadata to complete with data from the
     *  server.
     * @param {number} sample Sample index from a batch of data.
     * @param {number} step Step value, representing a point in the time when the
        event occurred.
     * @param {!Object} meshData Map to populate with mesh data.
     * @return {!Object} Promise object representing server request.
     * @private
     */
  _fetchDataByStep(
    run: string,
    tag: string,
    content_type: string,
    sample: number,
    step: number,
    meshData: any
  ) {
    const url = getRouter().pluginRoute(
      'mesh',
      '/data',
      new URLSearchParams({
        tag,
        run,
        content_type,
        sample: String(sample),
        step: String(step),
      })
    );
    const reshapeTo1xNx3 = function (data) {
      const channelsCount = 3;
      let items: any[] = [];
      for (let i = 0; i < data.length / channelsCount; i++) {
        let dataEntry: any[] = [];
        for (let j = 0; j < channelsCount; j++) {
          dataEntry.push(data[i * channelsCount + j]);
        }
        items.push(dataEntry);
      }
      return items;
    };
    const processData = this._canceller.cancellable((response) => {
      if (response.cancelled) {
        return Promise.reject({
          code: ErrorCodes.CANCELLED,
          message: 'Response was invalidated.',
        });
      }
      let buffer = response.value as ArrayBuffer;
      switch (content_type) {
        case 'VERTEX':
          meshData.vertices = reshapeTo1xNx3(new Float32Array(buffer));
          break;
        case 'FACE':
          meshData.faces = reshapeTo1xNx3(new Int32Array(buffer));
          break;
        case 'COLOR':
          meshData.colors = reshapeTo1xNx3(new Uint8Array(buffer));
          break;
      }
      return meshData;
    });

    return this._requestManager
      .fetch(url, {
        method: 'GET',
        headers: {
          responseType: 'arraybuffer',
          contentType: ContentTypeToItemType[content_type],
        },
      })
      .then((response) => response.arrayBuffer())
      .then(processData);
  }
  /**
   * Requests new data for each type of metadata from the server.
   * Metadata consists of wall_time, step, tensor shape, content type and other
   * info, but not tensor data itself.
   * @param {!Object} stepDatum Dictionary with mesh data for a current step.
   * @param {string} run Name of the run to get data for.
   * @param {string} tag Name of the tug to get data for.
   * @param {number} sample Sample index from a batch of data.
   * @return {!Object} Joint promise for all requests being sent.
   * @private
   */
  fetchData(stepDatum, run, tag, sample) {
    let promises: any[] = [];
    // Map to populate with mesh data, i.e. vertices, faces, etc.
    let meshData = new Map();
    Object.keys(ContentType).forEach((contentType) => {
      const component = 1 << ContentType[contentType];
      if (stepDatum.components & component) {
        promises.push(
          this._fetchDataByStep(
            run,
            tag,
            contentType,
            sample,
            stepDatum.step,
            meshData
          )
        );
      }
    });
    return Promise.all(promises);
  }
  /**
   * Requests new metadata from the server
   * @param {string} run Name of the run to get data for.
   * @param {string} tag Name of the tug to get data for.
   * @param {number} sample Sample index from a batch of data.
   *  completion.
   * @return {!Object} Promise for requested metadata.
   * @private
   */
  _fetchMetadata(run, tag, sample) {
    this._canceller.cancelAll();
    const url = getRouter().pluginRoute(
      'mesh',
      '/meshes',
      new URLSearchParams({tag, run, sample})
    );
    const requestData = this._canceller.cancellable((response) => {
      if (response.cancelled) {
        return Promise.reject({
          code: ErrorCodes.CANCELLED,
          message: 'Response was invalidated.',
        });
      }
      return response.value;
    });
    return this._requestManager
      .fetch(url)
      .then((response) => response.json())
      .then(requestData)
      .then(this._processMetadata.bind(this));
  }
  /**
   * Process server raw data into frontend friendly format.
   * @param {!Array|undefined} data list of raw server records.
   * @return {!Array} list of step datums.
   * @private
   */
  _processMetadata(data: any[] | undefined): unknown[] | undefined {
    if (!data) return;
    const stepToData = new Map<any, any>();
    for (let i = 0; i < data.length; i++) {
      let dataEntry = data[i];
      if (!stepToData.has(dataEntry.step)) {
        stepToData.set(dataEntry.step, []);
      }
      stepToData.get(dataEntry.step).push(dataEntry);
    }
    let datums: any[] = [];
    stepToData.forEach((data) => {
      let datum = this._createStepDatum(data[0]);
      datums.push(datum);
    });
    return datums;
  }
  /**
   * Process single row of server-side data and puts it in more structured form.
   * @param {!Object} metadata Object describing step summary.
   * @private
   * @return {!Object} with wall_time, step number and data for the step.
   */
  _createStepDatum(metadata) {
    return {
      // The wall time within the metadata is in seconds. The Date
      // constructor accepts a time in milliseconds, so we multiply by 1000.
      wall_time: new Date(metadata.wall_time * 1000),
      step: metadata.step,
      config: metadata.config,
      content_type: metadata.content_type,
      components: metadata.components,
    };
  }
}
