/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var tb_plugin;
(function (tb_plugin) {
    var lib;
    (function (lib) {
        var DO_NOT_USE_INTERNAL;
        (function (DO_NOT_USE_INTERNAL) {
            const { expect } = chai;
            const template = document.getElementById('iframe-template');
            describe('plugin-util', () => {
                beforeEach(function (done) {
                    const iframeFrag = document.importNode(template.content, true);
                    const iframe = iframeFrag.firstElementChild;
                    document.body.appendChild(iframe);
                    this.guestFrame = iframe;
                    this.guestWindow = iframe.contentWindow;
                    // Must wait for the JavaScript to be loaded on the child frame.
                    this.guestWindow.addEventListener('load', () => done());
                    this.sandbox = sinon.sandbox.create();
                });
                afterEach(function () {
                    document.body.removeChild(this.guestFrame);
                    this.sandbox.restore();
                });
                it('setUp sanity check', function () {
                    expect(this.guestWindow.plugin_internal)
                        .to.have.property('sendMessage')
                        .that.is.a('function');
                    expect(this.guestWindow.plugin_internal)
                        .to.have.property('listen')
                        .that.is.a('function');
                    expect(this.guestWindow.plugin_internal)
                        .to.have.property('unlisten')
                        .that.is.a('function');
                });
                [
                    {
                        spec: 'host (src) to guest (dest)',
                        beforeEachFunc: function () {
                            this.destWindow = this.guestWindow;
                            this.destListen = this.guestWindow.plugin_internal.listen;
                            this.destUnlisten = this.guestWindow.plugin_internal.unlisten;
                            this.destSendMessage = this.guestWindow.plugin_internal.sendMessage;
                            this.srcSendMessage = (type, payload) => {
                                return tb_plugin.host
                                    .broadcast(type, payload)
                                    .then(([result]) => result);
                            };
                        },
                    },
                    {
                        spec: 'guest (src) to host (dest)',
                        beforeEachFunc: function () {
                            this.destWindow = window;
                            this.destListen = tb_plugin.host.listen;
                            this.destUnlisten = tb_plugin.host.unlisten;
                            this.destSendMessage = (type, payload) => {
                                return tb_plugin.host
                                    .broadcast(type, payload)
                                    .then(([result]) => result);
                            };
                            this.srcSendMessage = this.guestWindow.plugin_internal.sendMessage;
                        },
                    },
                ].forEach(({ spec, beforeEachFunc }) => {
                    describe(spec, () => {
                        beforeEach(beforeEachFunc);
                        beforeEach(function () {
                            this.onMessage = this.sandbox.stub();
                            this.destListen('messageType', this.onMessage);
                        });
                        it('sends a message to dest', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                yield this.srcSendMessage('messageType', 'hello');
                                expect(this.onMessage.callCount).to.equal(1);
                                expect(this.onMessage.firstCall.args).to.deep.equal(['hello']);
                            });
                        });
                        it('sends a message a random payload not by ref', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const payload = {
                                    foo: 'foo',
                                    bar: {
                                        baz: 'baz',
                                    },
                                };
                                yield this.srcSendMessage('messageType', payload);
                                expect(this.onMessage.callCount).to.equal(1);
                                expect(this.onMessage.firstCall.args[0]).to.not.equal(payload);
                                expect(this.onMessage.firstCall.args[0]).to.deep.equal(payload);
                            });
                        });
                        it('resolves when dest replies with ack', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const sendMessageP = this.srcSendMessage('messageType', 'hello');
                                expect(this.onMessage.callCount).to.equal(0);
                                yield sendMessageP;
                                expect(this.onMessage.callCount).to.equal(1);
                                expect(this.onMessage.firstCall.args).to.deep.equal(['hello']);
                            });
                        });
                        it('triggers, on dest, a cb for the matching type', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const barCb = this.sandbox.stub();
                                this.destListen('bar', barCb);
                                yield this.srcSendMessage('bar', 'soap');
                                expect(this.onMessage.callCount).to.equal(0);
                                expect(barCb.callCount).to.equal(1);
                                expect(barCb.firstCall.args).to.deep.equal(['soap']);
                            });
                        });
                        it('supports single listener for a type', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const barCb1 = this.sandbox.stub();
                                const barCb2 = this.sandbox.stub();
                                this.destListen('bar', barCb1);
                                this.destListen('bar', barCb2);
                                yield this.srcSendMessage('bar', 'soap');
                                expect(barCb1.callCount).to.equal(0);
                                expect(barCb2.callCount).to.equal(1);
                                expect(barCb2.firstCall.args).to.deep.equal(['soap']);
                            });
                        });
                        describe('dest message handling', () => {
                            [
                                { specName: 'undefined', payload: null, expectDeep: false },
                                { specName: 'null', payload: undefined, expectDeep: false },
                                { specName: 'string', payload: 'something', expectDeep: false },
                                { specName: 'number', payload: 3.14, expectDeep: false },
                                { specName: 'object', payload: { some: 'object' }, expectDeep: true },
                                { specName: 'array', payload: ['a', 'b', 'c'], expectDeep: true },
                            ].forEach(({ specName, payload, expectDeep }) => {
                                it(specName, function () {
                                    return __awaiter(this, void 0, void 0, function* () {
                                        this.destListen('bar', () => payload);
                                        const response = yield this.srcSendMessage('bar', 'soap');
                                        if (expectDeep) {
                                            expect(response).to.deep.equal(payload);
                                        }
                                        else {
                                            expect(response).to.equal(payload);
                                        }
                                    });
                                });
                            });
                        });
                        it('unregister a callback with unlisten', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const barCb = this.sandbox.stub();
                                this.destListen('bar', barCb);
                                yield this.srcSendMessage('bar', 'soap');
                                expect(barCb.callCount).to.equal(1);
                                this.destUnlisten('bar');
                                yield this.srcSendMessage('bar', 'soap');
                                expect(barCb.callCount).to.equal(1);
                            });
                        });
                        it('ignores foreign postMessages', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                const barCb = this.sandbox.stub();
                                this.destListen('bar', barCb);
                                const fakeMessage = {
                                    type: 'bar',
                                    id: 0,
                                    payload: '',
                                    error: null,
                                    isReply: false,
                                };
                                this.destWindow.postMessage(JSON.stringify(fakeMessage), '*');
                                // Await another message to ensure fake message was handled in dest.
                                yield this.srcSendMessage('not-bar');
                                expect(barCb).to.not.have.been.called;
                            });
                        });
                        it('processes messages while waiting for a reponse', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                let resolveLongTask = null;
                                this.destListen('longTask', () => {
                                    return new Promise((resolve) => {
                                        resolveLongTask = resolve;
                                    });
                                });
                                const longTaskStub = this.sandbox.stub();
                                const longTaskPromise = this.srcSendMessage('longTask', 'hello').then(longTaskStub);
                                yield this.srcSendMessage('foo');
                                yield this.destSendMessage('bar');
                                expect(longTaskStub).to.not.have.been.called;
                                resolveLongTask('payload');
                                const longTaskResult = yield longTaskPromise;
                                expect(longTaskStub).to.have.been.calledOnce;
                                expect(longTaskStub).to.have.been.calledWith('payload');
                            });
                        });
                    });
                });
            });
        })(DO_NOT_USE_INTERNAL = lib.DO_NOT_USE_INTERNAL || (lib.DO_NOT_USE_INTERNAL = {}));
    })(lib = tb_plugin.lib || (tb_plugin.lib = {}));
})(tb_plugin || (tb_plugin = {})); // namespace tf_plugin.lib.DO_NOT_USE_INTERNAL
