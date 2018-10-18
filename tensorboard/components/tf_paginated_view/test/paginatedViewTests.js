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
/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
var tf_paginated_view;
(function (tf_paginated_view) {
    var _this = this;
    var expect = chai.expect;
    function createItems(num) {
        return Array.from(Array(num))
            .map(function (_, i) { return ({ id: "id" + i, content: "content_" + i }); });
    }
    function flushP() {
        return new Promise(function (resolve) { return window.flush(resolve); });
    }
    function flushAnimationFrameP() {
        return new Promise(function (resolve) { return window.animationFrameFlush(resolve); });
    }
    function flushAllP() {
        return Promise.all([flushP(), flushAnimationFrameP()]);
    }
    describe('tf-paginated-view tests', function () {
        var view;
        function goNext() {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            view.querySelector('.big-page-buttons paper-button:last-of-type').click();
                            return [4 /*yield*/, flushAllP()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        view = fixture('paginatedViewFixture');
                        view._limit = 2;
                        view.getItemKey = function (_a) {
                            var id = _a.id;
                            return id;
                        };
                        view.items = createItems(5);
                        view.randomNumber = 42;
                        // allow dom-if to be flushed.
                        return [4 /*yield*/, flushAllP()];
                    case 1:
                        // allow dom-if to be flushed.
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('renders a page', function () {
            expect(view.querySelector('#id0')).to.be.not.null;
            expect(view.querySelector('#id1')).to.be.not.null;
            // 2-4 should be in another page.
            expect(view.querySelector('#id2')).to.be.null;
        });
        it('responds to ancestor prop change that is bound on template', function () {
            expect(view.querySelector('#id0').getAttribute('number')).to.equal('42');
            view.randomNumber = 7;
            expect(view.querySelector('#id0').getAttribute('number')).to.equal('7');
        });
        it('navigates to next page when clicked on a button', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Sanity check
                        expect(view.querySelector('#id2')).to.be.null;
                        expect(view.querySelector('#id4')).to.be.null;
                        expect(view.querySelector('paper-input')).to.have.property('value', '1');
                        return [4 /*yield*/, goNext()];
                    case 1:
                        _a.sent();
                        expect(view.querySelector('#id1')).to.be.null;
                        expect(view.querySelector('#id2')).to.be.not.null;
                        expect(view.querySelector('#id3')).to.be.not.null;
                        expect(view.querySelector('#id4')).to.be.null;
                        expect(view.querySelector('paper-input')).to.have.property('value', '2');
                        return [4 /*yield*/, goNext()];
                    case 2:
                        _a.sent();
                        expect(view.querySelector('#id3')).to.be.null;
                        expect(view.querySelector('#id4')).to.be.not.null;
                        expect(view.querySelector('paper-input')).to.have.property('value', '3');
                        return [2 /*return*/];
                }
            });
        }); });
        it('reacts to limit change', function () {
            // 2-4 should be in another page, initially.
            expect(view.querySelector('#id2')).to.be.null;
            view._limit = 4;
            expect(view.querySelector('#id2')).to.be.not.null;
            expect(view.querySelector('#id3')).to.be.not.null;
            expect(view.querySelector('#id4')).to.be.null;
        });
        it('reacts to items update', function () {
            view.items = view.items.slice().reverse();
            expect(view.querySelector('#id4')).to.be.not.null;
            expect(view.querySelector('#id3')).to.be.not.null;
        });
        it('handles shrinking the number of pages', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        view.items = createItems(1);
                        return [4 /*yield*/, flushAllP()];
                    case 1:
                        _a.sent();
                        expect(view.querySelector('#id0')).to.be.not.null;
                        expect(view.querySelector('#id1')).to.be.null;
                        expect(_getPageCount()).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('handles growing the number of pages', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        expect(_getPageCount()).to.equal(3);
                        view.items = createItems(10);
                        return [4 /*yield*/, flushAllP()];
                    case 1:
                        _a.sent();
                        expect(_getPageCount()).to.equal(5);
                        return [2 /*return*/];
                }
            });
        }); });
        function _getPageCount() {
            // str = `Page <some gibbersh from paper-input> of [pageCount]`
            var str = view.querySelector('#controls-container').innerText.trim();
            return parseInt(str.match(/\d+$/)[0], 10);
        }
    });
})(tf_paginated_view || (tf_paginated_view = {})); // namespace tf_paginated_view
