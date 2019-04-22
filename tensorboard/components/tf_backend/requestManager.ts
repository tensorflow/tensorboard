/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace tf_backend {


interface ResolveReject {
  resolve: Function;
  reject: Function;
}

/**
 * Manages many fetch requests. Launches up to nSimultaneousRequests
 * simultaneously, and maintains a LIFO queue of requests to process when
 * more urls are requested than can be handled at once. The queue can be
 * cleared.
 *
 * When a request is made, a Promise is returned which resolves with the
 * parsed JSON result from the request.
 */
export class RequestCancellationError extends Error {
  public name = 'RequestCancellationError';
}

export class InvalidRequestOptionsError extends Error {
  public name = 'InvalidRequestOptionsError';
  constructor(msg : string) {
    super(msg);
    // The following is needed due to a limitation of TypeScript when
    // extending 'Error'. See: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, InvalidRequestOptionsError.prototype);
  }
}

export class RequestNetworkError extends Error {
  public name: string;
  public req: XMLHttpRequest;
  public url: string;

  constructor(req: XMLHttpRequest, url) {
    super();
    this.message = `RequestNetworkError: ${req.status} at ${url}`;
    this.name = 'RequestNetworkError';
    this.req = req;
    this.url = url;
  }
}

/** The HTTP method-type to use. Currently only 'GET' and 'POST' are
 * supported.
 */
export enum HttpMethodType {
  GET = 'GET',
  POST = 'POST',
}

/**
 * Holds options that can be used to configure the HTTP request.
 */
export class RequestOptions {
  public methodType: HttpMethodType;

  /** The content-type request header to use. Cannot be set for a GET request.*/
  public contentType?: string;

  /** The request body to use. This is the object that is passed to the
   * XMLHttpRequest.send() method. If not given the 'send' method is called
   * without an argument.
   */
  public body?: any;

  /** If specified, this will be the value set in the
   * XMLHttpRequest.withCredentials property.
   */
  public withCredentials?: boolean;

  // Validates this object. Throws InvalidRequestOptionsError on error.
  public validate() {
    if (this.methodType === HttpMethodType.GET) {
      // We don't allow a body for a GET.
      if (this.body) {
        throw new InvalidRequestOptionsError(
          'body must be missing for a GET request.');
      }
    }
    // We allow body-less or contentType-less POSTs even if they don't
    // make much sense.
  }
}

export class RequestManager {
  private _queue: ResolveReject[];
  private _maxRetries: number;
  private _nActiveRequests: number;
  private _nSimultaneousRequests: number;

  constructor(nSimultaneousRequests = 10, maxRetries = 3) {
    this._queue = [];
    this._nActiveRequests = 0;
    this._nSimultaneousRequests = nSimultaneousRequests;
    this._maxRetries = maxRetries;
  }

  /**
   * Gives a promise that loads assets from given url (respects queuing). If
   * postData is provided, this request will use POST, not GET. This is an
   * object mapping POST keys to string values.
   */
  public request(url: string, postData?: {[key: string]: string}):
      Promise<any> {
    const requestOptions = requestOptionsFromPostData(postData);
    return this.requestWithOptions(url, requestOptions);
  }

  public requestWithOptions(url: string, requestOptions: RequestOptions):
      Promise<any> {
    requestOptions.validate();
    const promise = new Promise((resolve, reject) => {
        const resolver = {resolve: resolve, reject: reject};
        this._queue.push(resolver);
        this.launchRequests();
      })
      .then(() => {
        return this.promiseWithRetries(url, this._maxRetries, requestOptions);
      })
      .then(
        (response) => {
          // Success - Let's free space for another active
          // request, and launch it
          this._nActiveRequests--;
          this.launchRequests();
          return response;
        },
        (rejection) => {
          if (rejection.name === 'RequestNetworkError') {
            // If we failed due to network error, we should
            // decrement
            // _nActiveRequests because this request was
            // active
            this._nActiveRequests--;
            this.launchRequests();
          }
          return Promise.reject(rejection);
        });
    return promise;
  }

  public fetch(url: string, fetchOptions?: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
        const resolver = {resolve: resolve, reject: reject};
        this._queue.push(resolver);
        this.launchRequests();
    }).then(() => {
      let numTries = 1;
      return new Promise<Response>((resolve) => {
        const retryFetch = () => {
          fetch(url, fetchOptions).then((response) => {
            if (!response.ok && this._maxRetries > numTries) {
              numTries++;
              retryFetch();
              return;
            }
            resolve(response);
            this._nActiveRequests--;
            this.launchRequests();
          });
        }

        retryFetch();
      });
    });
  }

  public clearQueue() {
    while (this._queue.length > 0) {
      this._queue.pop().reject(
          new RequestCancellationError('Request cancelled by clearQueue'));
    }
  }

  /* Return number of currently pending requests */
  public activeRequests(): number {
    return this._nActiveRequests;
  }

  /* Return total number of outstanding requests (includes queue) */
  public outstandingRequests(): number {
    return this._nActiveRequests + this._queue.length;
  }

  private launchRequests() {
    while (this._nActiveRequests < this._nSimultaneousRequests &&
           this._queue.length > 0) {
      this._nActiveRequests++;
      this._queue.pop().resolve();
    }
  }

  /**
   * Try to request a given URL using overwritable _promiseFromUrl method.
   * If the request fails for any reason, we will retry up to maxRetries
   * times. In practice, this will help us paper over transient network issues
   * like '502 Bad Gateway'.
   * By default, Chrome displays network errors in console, so
   * the user will be able to tell when the requests are failing. I think this
   * is a feature, if the request failures and retries are causing any
   * pain to users, they can see it and file issues.
   */
  private promiseWithRetries(
      url: string, maxRetries: number, requestOptions: RequestOptions) {
    var success = (x) => x;
    var failure = (x) => {
      if (maxRetries > 0) {
        return this.promiseWithRetries(url, maxRetries - 1, requestOptions);
      } else {
        return Promise.reject(x);
      }
    };
    return this._promiseFromUrl(url, requestOptions).then(success, failure);
  }

  /* Actually get promise from url using XMLHttpRequest */
  protected _promiseFromUrl(url: string, requestOptions: RequestOptions) {
    return new Promise((resolve, reject) => {
      const req = buildXMLHttpRequest(
        requestOptions.methodType,
        url,
        requestOptions.withCredentials,
        requestOptions.contentType);
      req.onload = function() {
        if (req.status === 200) {
          resolve(JSON.parse(req.responseText));
        } else {
          reject(new RequestNetworkError(req, url));
        }
      };
      req.onerror = function() {
        reject(new RequestNetworkError(req, url));
      };
      if (requestOptions.body) {
        req.send(requestOptions.body);
      }
      else {
        req.send();
      }
    });
  }
}

function buildXMLHttpRequest(methodType: HttpMethodType, url: string,
                             withCredentials?: boolean,
                             contentType?: string): XMLHttpRequest {
  const req = new XMLHttpRequest();
  req.open(methodType, url);
  if (withCredentials) {
    req.withCredentials = withCredentials;
  }
  if (contentType) {
    req.setRequestHeader('Content-Type', contentType);
  }
  return req;
}

function requestOptionsFromPostData(postData?: {[key: string]: string}):
    RequestOptions {
  const result = new RequestOptions();
  if (!postData) {
    result.methodType = HttpMethodType.GET;
    return result;
  }
  result.methodType = HttpMethodType.POST;
  result.body = formDataFromDictionary(postData);
  return result;
}

function formDataFromDictionary(postData: {[key: string]: string}) {
  const formData = new FormData();
  for (let postKey in postData) {
    if (postKey) {
      // The linter requires 'for in' loops to be filtered by an if
      // condition.
      formData.append(postKey, postData[postKey]);
    }
  }
  return formData;
}

}  // namespace tf_backend
