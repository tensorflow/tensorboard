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
import {
  HttpMethodType,
  RequestOptions,
} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';

/* A 'tf-hparams-backend' encapsulates sending HParams API requests to the
   backend.
   Any implementation with the same public interface can be passed to
   tf-hparams-main as the 'backend' property.
*/
export class Backend {
  private _requestManager: any;
  private _useHttpGet: any;

  // Constructs a backend that uses the given tf_backend.requestManager to
  // send requests. If useHttpGet is true uses HTTP GET to send a request
  // otherwise uses HTTP POST. See tensorboard/plugins/hparams/http_api.md
  // for details on how the requests and responses are encoded in each
  // scheme (GET or POST).
  constructor(requestManager, useHttpGet = true) {
    this._requestManager = requestManager;
    this._useHttpGet = useHttpGet;
  }
  // In the API methods below, 'request' should be a JSON translated request
  // protocol buffer and the response is a JSON translated response protocol
  // buffer. See api.proto for the details.
  getExperiment(experimentRequest) {
    return this._sendRequest('/experiment', experimentRequest);
  }
  getDownloadUrl(format, listSessionGroupsRequest, columnsVisibility) {
    return getRouter().pluginRouteForSrc(
      'hparams',
      '/download_data',
      new URLSearchParams({
        format: format,
        columnsVisibility: JSON.stringify(columnsVisibility),
        request: JSON.stringify(listSessionGroupsRequest),
      })
    );
  }
  listSessionGroups(listSessionGroupsRequest) {
    return this._sendRequest('/session_groups', listSessionGroupsRequest);
  }
  listMetricEvals(listMetricEvalsRequest) {
    return this._sendRequest('/metric_evals', listMetricEvalsRequest);
  }
  // ---- Private methods below -------------------------------------------
  _sendRequest(methodName, request_proto) {
    if (this._useHttpGet) {
      const url = getRouter().pluginRoute(
        'hparams',
        methodName,
        new URLSearchParams({
          request: JSON.stringify(request_proto),
        })
      );
      return this._requestManager.request(url);
    }
    /* Use POST */
    const requestOptions = new RequestOptions();
    requestOptions.withCredentials = true;
    requestOptions.methodType = HttpMethodType.POST;
    requestOptions.contentType = 'text/plain';
    requestOptions.body = JSON.stringify(request_proto);
    const url = getRouter().pluginRoute('hparams', methodName);
    return this._requestManager.requestWithOptions(url, requestOptions);
  }
}
