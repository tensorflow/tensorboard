var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var tf_backend;
(function (tf_backend) {
    var expect = chai.expect;
    var MockedRequestManager = /** @class */ (function (_super) {
        __extends(MockedRequestManager, _super);
        function MockedRequestManager(maxRequests, maxRetries) {
            if (maxRequests === void 0) { maxRequests = 10; }
            if (maxRetries === void 0) { maxRetries = 3; }
            var _this = _super.call(this, maxRequests, maxRetries) || this;
            _this.resolvers = [];
            _this.rejectors = [];
            _this.requestsDispatched = 0;
            return _this;
        }
        MockedRequestManager.prototype._promiseFromUrl = function (url) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var mockJSON = {
                    ok: true,
                    json: function () {
                        return url;
                    },
                    url: url,
                    status: 200,
                };
                var mockFailedRequest = {
                    ok: false,
                    url: url,
                    status: 502,
                };
                var mockFailure = new tf_backend.RequestNetworkError(mockFailedRequest, url);
                _this.resolvers.push(function () {
                    resolve(mockJSON);
                });
                _this.rejectors.push(function () {
                    reject(mockFailure);
                });
                _this.requestsDispatched++;
            });
        };
        MockedRequestManager.prototype.resolveFakeRequest = function () {
            this.resolvers.pop()();
        };
        MockedRequestManager.prototype.rejectFakeRequest = function () {
            this.rejectors.pop()();
        };
        MockedRequestManager.prototype.dispatchAndResolve = function () {
            var _this = this;
            // Wait for at least one request to be dispatched, then resolve it.
            this.waitForDispatch(1).then(function () { return _this.resolveFakeRequest(); });
        };
        MockedRequestManager.prototype.waitForDispatch = function (num) {
            var _this = this;
            return waitForCondition(function () {
                return _this.requestsDispatched >= num;
            });
        };
        return MockedRequestManager;
    }(tf_backend.RequestManager));
    /** Create a promise that returns when *check* returns true.
     * May cause a test timeout if check never becomes true.
     */
    function waitForCondition(check) {
        return new Promise(function (resolve, reject) {
            var go = function () {
                if (check()) {
                    resolve();
                }
                setTimeout(go, 2);
            };
            go();
        });
    }
    describe('backend', function () {
        var sandbox;
        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });
        afterEach(function () {
            sandbox.restore();
        });
        describe('request manager', function () {
            it('request loads JSON properly', function (done) {
                var rm = new tf_backend.RequestManager();
                var promise = rm.request('data/example.json');
                promise.then(function (response) {
                    chai.assert.deepEqual(response, { foo: 3, bar: 'zoidberg' });
                    done();
                }, function (reject) {
                    throw new Error(reject);
                });
            });
            it('rejects on bad url', function (done) {
                var rm = new tf_backend.RequestManager(5, 0);
                var badUrl = '_bad_url_which_doesnt_exist.json';
                var promise = rm.request(badUrl);
                promise.then(function (success) {
                    done(new Error('the promise should have rejected'));
                }, function (reject) {
                    chai.assert.include(reject.message, '404');
                    chai.assert.include(reject.message, badUrl);
                    chai.assert.equal(reject.req.status, 404);
                    done();
                });
            });
            it('can retry if requests fail', function (done) {
                var rm = new MockedRequestManager(3, 5);
                var r = rm.request('foo');
                rm.waitForDispatch(1)
                    .then(function () {
                    rm.rejectFakeRequest();
                    return rm.waitForDispatch(2);
                })
                    .then(function () { return rm.resolveFakeRequest(); });
                r.then(function (success) { return done(); });
            });
            it('retries at most maxRetries times', function (done) {
                var MAX_RETRIES = 2;
                var rm = new MockedRequestManager(3, MAX_RETRIES);
                var r = rm.request('foo');
                rm.waitForDispatch(1)
                    .then(function () {
                    rm.rejectFakeRequest();
                    return rm.waitForDispatch(2);
                })
                    .then(function () {
                    rm.rejectFakeRequest();
                    return rm.waitForDispatch(3);
                })
                    .then(function () {
                    rm.rejectFakeRequest();
                });
                r.then(function (success) { return done(new Error('The request should have failed')); }, function (failure) { return done(); });
            });
            it('requestManager only sends maxRequests requests at a time', function (done) {
                var rm = new MockedRequestManager(3);
                var r0 = rm.request('1');
                var r1 = rm.request('2');
                var r2 = rm.request('3');
                var r3 = rm.request('4');
                chai.assert.equal(rm.activeRequests(), 3, 'three requests are active');
                chai.assert.equal(rm.outstandingRequests(), 4, 'four requests are pending');
                rm.waitForDispatch(3)
                    .then(function () {
                    chai.assert.equal(rm.activeRequests(), 3, 'three requests are still active (1)');
                    chai.assert.equal(rm.requestsDispatched, 3, 'three requests were dispatched');
                    rm.resolveFakeRequest();
                    return rm.waitForDispatch(4);
                })
                    .then(function () {
                    chai.assert.equal(rm.activeRequests(), 3, 'three requests are still active (2)');
                    chai.assert.equal(rm.requestsDispatched, 4, 'four requests were dispatched');
                    chai.assert.equal(rm.outstandingRequests(), 3, 'three requests are pending');
                    rm.resolveFakeRequest();
                    rm.resolveFakeRequest();
                    rm.resolveFakeRequest();
                    return r3;
                })
                    .then(function () {
                    chai.assert.equal(rm.activeRequests(), 0, 'all requests finished');
                    chai.assert.equal(rm.outstandingRequests(), 0, 'no requests pending');
                    done();
                });
            });
            it('queue continues after failures', function (done) {
                var rm = new MockedRequestManager(1, 0);
                var r0 = rm.request('1');
                var r1 = rm.request('2');
                rm.waitForDispatch(1).then(function () {
                    rm.rejectFakeRequest();
                });
                r0.then(function (success) { return done(new Error('r0 should have failed')); }, function (failure) { return 'unused_argument'; })
                    .then(function () { return rm.resolveFakeRequest(); });
                // When the first request rejects, it should decrement nActiveRequests
                // and then launch remaining requests in queue (i.e. this one)
                r1.then(function (success) { return done(); }, function (failure) { return done(new Error(failure)); });
            });
            it('queue is LIFO', function (done) {
                /* This test is a bit tricky.
                 * We want to verify that the RequestManager queue has LIFO semantics.
                 * So we construct three requests off the bat: A, B, C.
                 * So LIFO semantics ensure these will resolve in order A, C, B.
                 * (Because the A request launches immediately when we create it, it's
                 * not in queue)
                 * Then after resolving A, C moves out of queue, and we create X.
                 * So expected final order is A, C, X, B.
                 * We verify this with an external var that counts how many requests were
                 * resolved.
                 */
                var rm = new MockedRequestManager(1);
                var nResolved = 0;
                function assertResolutionOrder(expectedSpotInSequence) {
                    return function () {
                        nResolved++;
                        chai.assert.equal(expectedSpotInSequence, nResolved);
                    };
                }
                function launchThirdRequest() {
                    rm.request('started late but goes third')
                        .then(assertResolutionOrder(3))
                        .then(function () { return rm.dispatchAndResolve(); });
                }
                rm.request('first')
                    .then(assertResolutionOrder(1)) // Assert that this one resolved first
                    .then(launchThirdRequest)
                    .then(function () { return rm.dispatchAndResolve(); }); // then trigger the next one
                rm.request('this one goes fourth') // created second, will go last
                    .then(assertResolutionOrder(4)) // assert it was the fourth to get resolved
                    .then(done); // finish the test
                rm.request('second')
                    .then(assertResolutionOrder(2))
                    .then(function () { return rm.dispatchAndResolve(); });
                rm.dispatchAndResolve();
            });
            it('requestManager can clear queue', function (done) {
                var rm = new MockedRequestManager(1);
                var requestsResolved = 0;
                var requestsRejected = 0;
                var success = function () { return requestsResolved++; };
                var failure = function (err) {
                    chai.assert.equal(err.name, 'RequestCancellationError');
                    requestsRejected++;
                };
                var finishTheTest = function () {
                    chai.assert.equal(rm.activeRequests(), 0, 'no requests still active');
                    chai.assert.equal(rm.requestsDispatched, 1, 'only one req was ever dispatched');
                    chai.assert.equal(rm.outstandingRequests(), 0, 'no pending requests');
                    chai.assert.equal(requestsResolved, 1, 'one request got resolved');
                    chai.assert.equal(requestsRejected, 4, 'four were cancelled and threw errors');
                    done();
                };
                rm.request('0').then(success, failure).then(finishTheTest);
                rm.request('1').then(success, failure);
                rm.request('2').then(success, failure);
                rm.request('3').then(success, failure);
                rm.request('4').then(success, failure);
                chai.assert.equal(rm.activeRequests(), 1, 'one req is active');
                rm.waitForDispatch(1).then(function () {
                    chai.assert.equal(rm.activeRequests(), 1, 'one req is active');
                    chai.assert.equal(rm.requestsDispatched, 1, 'one req was dispatched');
                    chai.assert.equal(rm.outstandingRequests(), 5, 'five reqs outstanding');
                    rm.clearQueue();
                    rm.resolveFakeRequest();
                    // resolving the first request triggers finishTheTest
                });
            });
            it('throws an error when a GET request has a body', function () {
                var rm = new tf_backend.RequestManager();
                var badOptions = new tf_backend.RequestOptions();
                badOptions.methodType = tf_backend.HttpMethodType.GET;
                badOptions.body = "a body";
                chai.assert.throws(function () { return rm.requestWithOptions("http://www.google.com", badOptions); }, tf_backend.InvalidRequestOptionsError);
            });
            describe('tests using sinon.fakeServer', function () {
                var server;
                beforeEach(function () {
                    server = sinon.fakeServer.create();
                    server.respondImmediately = true;
                    server.respondWith("{}");
                });
                afterEach(function () {
                    server.restore();
                });
                it('builds correct XMLHttpRequest when request(url) is called', function () {
                    var rm = new tf_backend.RequestManager();
                    return rm.request("my_url")
                        .then(function () {
                        chai.assert.lengthOf(server.requests, 1);
                        chai.assert.equal(server.requests[0].url, "my_url");
                        chai.assert.equal(server.requests[0].requestBody, null);
                        chai.assert.equal(server.requests[0].method, tf_backend.HttpMethodType.GET);
                        chai.assert.notProperty(server.requests[0].requestHeaders, "Content-Type");
                    });
                });
                it('builds correct XMLHttpRequest when request(url, postData) is called', function () {
                    var rm = new tf_backend.RequestManager();
                    return rm.request("my_url", { "key1": "value1", "key2": "value2" })
                        .then(function () {
                        chai.assert.lengthOf(server.requests, 1);
                        chai.assert.equal(server.requests[0].url, "my_url");
                        chai.assert.equal(server.requests[0].method, tf_backend.HttpMethodType.POST);
                        chai.assert.instanceOf(server.requests[0].requestBody, FormData);
                        chai.assert.sameDeepMembers(Array.from(server.requests[0].requestBody.entries()), [["key1", "value1"], ["key2", "value2"]]);
                    });
                });
                it('builds correct XMLHttpRequest when requestWithOptions is called', function () {
                    var rm = new tf_backend.RequestManager();
                    var requestOptions = new tf_backend.RequestOptions();
                    requestOptions.methodType = tf_backend.HttpMethodType.POST;
                    requestOptions.contentType = "text/plain;charset=utf-8";
                    requestOptions.body = "the body";
                    return rm.requestWithOptions("my_url", requestOptions)
                        .then(function () {
                        chai.assert.lengthOf(server.requests, 1);
                        chai.assert.equal(server.requests[0].url, "my_url");
                        chai.assert.equal(server.requests[0].method, tf_backend.HttpMethodType.POST);
                        chai.assert.equal(server.requests[0].requestBody, "the body");
                        chai.assert.equal(server.requests[0].requestHeaders["Content-Type"], "text/plain;charset=utf-8");
                    });
                });
            });
            describe('fetch', function () {
                beforeEach(function () {
                    this.stubbedFetch = sandbox.stub(window, 'fetch');
                    this.clock = sandbox.useFakeTimers();
                    this.resolvesAfter = function (value, timeInMs) {
                        return new Promise(function (resolve) {
                            setTimeout(function () { return resolve(value); }, timeInMs);
                        });
                    };
                });
                it('resolves', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var rm, response, body;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.stubbedFetch.returns(Promise.resolve(new Response('Success', { status: 200 })));
                                    rm = new tf_backend.RequestManager();
                                    return [4 /*yield*/, rm.fetch('foo')];
                                case 1:
                                    response = _a.sent();
                                    expect(response).to.have.property('ok', true);
                                    expect(response).to.have.property('status', 200);
                                    return [4 /*yield*/, response.text()];
                                case 2:
                                    body = _a.sent();
                                    expect(body).to.equal('Success');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('retries', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var rm, response, body;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.stubbedFetch.onCall(0).returns(Promise.resolve(new Response('Error 1', { status: 500 })));
                                    this.stubbedFetch.onCall(1).returns(Promise.resolve(new Response('Error 2', { status: 500 })));
                                    this.stubbedFetch.onCall(2).returns(Promise.resolve(new Response('Success', { status: 200 })));
                                    rm = new tf_backend.RequestManager();
                                    return [4 /*yield*/, rm.fetch('foo')];
                                case 1:
                                    response = _a.sent();
                                    expect(response).to.have.property('ok', true);
                                    expect(response).to.have.property('status', 200);
                                    return [4 /*yield*/, response.text()];
                                case 2:
                                    body = _a.sent();
                                    expect(body).to.equal('Success');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('gives up after max retries', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var failure, rm, response, body;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    failure = new Response('Error', { status: 500 });
                                    this.stubbedFetch.returns(Promise.resolve(failure));
                                    rm = new tf_backend.RequestManager();
                                    return [4 /*yield*/, rm.fetch('foo')];
                                case 1:
                                    response = _a.sent();
                                    // TODO(stephanwlee): Make sure to use sinon-chai when typing is proper.
                                    expect(this.stubbedFetch.callCount).to.equal(3);
                                    expect(response).to.have.property('ok', false);
                                    expect(response).to.have.property('status', 500);
                                    return [4 /*yield*/, response.text()];
                                case 2:
                                    body = _a.sent();
                                    expect(body).to.equal('Error');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('sends requests concurrently', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var rm, promise1, promise2, secondResponse, secondBody, firstResponse, firstBody;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.stubbedFetch.onCall(0).returns(this.resolvesAfter(new Response('nay', { status: 200 }), 3000));
                                    this.stubbedFetch.onCall(1).returns(Promise.resolve(new Response('yay', { status: 200 })));
                                    rm = new tf_backend.RequestManager(/** nSimultaneousRequests */ 2);
                                    promise1 = rm.fetch('foo');
                                    promise2 = rm.fetch('bar');
                                    return [4 /*yield*/, Promise.race([promise1, promise2])];
                                case 1:
                                    secondResponse = _a.sent();
                                    return [4 /*yield*/, secondResponse.text()];
                                case 2:
                                    secondBody = _a.sent();
                                    expect(secondBody).to.equal('yay');
                                    this.clock.tick(3000);
                                    return [4 /*yield*/, promise1];
                                case 3:
                                    firstResponse = _a.sent();
                                    return [4 /*yield*/, firstResponse.text()];
                                case 4:
                                    firstBody = _a.sent();
                                    expect(firstBody).to.equal('nay');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
                it('queues requests', function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var rm, promise1, promise2, firstResponse, firstBody, secondResponse, secondBody;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.stubbedFetch.onCall(0).returns(this.resolvesAfter(new Response('nay', { status: 200 }), 3000));
                                    this.stubbedFetch.onCall(1).returns(Promise.resolve(new Response('yay', { status: 200 })));
                                    rm = new tf_backend.RequestManager(/** nSimultaneousRequests */ 1);
                                    promise1 = rm.fetch('foo');
                                    promise2 = rm.fetch('bar');
                                    expect(rm.activeRequests()).to.equal(1);
                                    expect(rm.outstandingRequests()).to.equal(2);
                                    this.clock.tick(3000);
                                    return [4 /*yield*/, Promise.race([promise1, promise2])];
                                case 1:
                                    firstResponse = _a.sent();
                                    return [4 /*yield*/, firstResponse.text()];
                                case 2:
                                    firstBody = _a.sent();
                                    expect(firstBody).to.equal('nay');
                                    return [4 /*yield*/, promise2];
                                case 3:
                                    secondResponse = _a.sent();
                                    return [4 /*yield*/, secondResponse.text()];
                                case 4:
                                    secondBody = _a.sent();
                                    expect(secondBody).to.equal('yay');
                                    return [2 /*return*/];
                            }
                        });
                    });
                });
            });
        });
    });
})(tf_backend || (tf_backend = {})); // namespace tf_backend
