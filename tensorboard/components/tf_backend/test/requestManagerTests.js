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
        });
    });
})(tf_backend || (tf_backend = {})); // namespace tf_backend
