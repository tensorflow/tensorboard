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
import * as pluginHost from '../plugin-host.js';
import {Message} from '../message.js';

namespace tf_plugin.test {
  const {expect} = chai;
  const template = document.getElementById(
    'iframe-template'
  ) as HTMLTemplateElement;

  describe('plugin-util', () => {
    beforeEach(function(done) {
      const iframeFrag = document.importNode(template.content, true);
      const iframe = iframeFrag.firstElementChild as HTMLIFrameElement;
      document.body.appendChild(iframe);
      this.guestFrame = iframe;
      this.guestWindow = iframe.contentWindow;
      // Must wait for the JavaScript to be loaded on the child frame.
      this.guestWindow.addEventListener('load', () => done());

      this.sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      document.body.removeChild(this.guestFrame);
      this.sandbox.restore();
    });

    it('setUp sanity check', function() {
      expect(this.guestWindow.test)
        .to.have.property('sendMessage')
        .that.is.a('function');
      expect(this.guestWindow.test)
        .to.have.property('listen')
        .that.is.a('function');
      expect(this.guestWindow.test)
        .to.have.property('unlisten')
        .that.is.a('function');
    });

    [
      {
        spec: 'host (src) to guest (dest)',
        beforeEachFunc: function() {
          this.destWindow = this.guestWindow;
          this.destListen = this.guestWindow.test.listen;
          this.destUnlisten = this.guestWindow.test.unlisten;
          this.destSendMessage = this.guestWindow.test.sendMessage;
          this.srcSendMessage = (type, payload) => {
            return new Promise(async (resolve) => {
              const results = await pluginHost.broadcast(type, payload);
              resolve(results[0]);
            });
          };
        },
      },
      {
        spec: 'guest (src) to host (dest)',
        beforeEachFunc: function() {
          this.destWindow = window;
          this.destListen = pluginHost.listen;
          this.destUnlisten = pluginHost.unlisten;
          this.destSendMessage = (type, payload) => {
            return new Promise(async (resolve) => {
              const results = await pluginHost.broadcast(type, payload);
              resolve(results[0]);
            });
          };
          this.srcSendMessage = this.guestWindow.test.sendMessage;
        },
      },
    ].forEach(({spec, beforeEachFunc}) => {
      describe(spec, () => {
        beforeEach(beforeEachFunc);

        beforeEach(function() {
          this.onMessage = this.sandbox.stub();
          this.destListen('messageType', this.onMessage);
        });

        it('sends a message to dest', async function() {
          await this.srcSendMessage('messageType', 'hello');
          expect(this.onMessage.callCount).to.equal(1);
          expect(this.onMessage.firstCall.args).to.deep.equal(['hello']);
        });

        it('sends a message a random payload not by ref', async function() {
          const payload = {
            foo: 'foo',
            bar: {
              baz: 'baz',
            },
          };
          await this.srcSendMessage('messageType', payload);
          expect(this.onMessage.callCount).to.equal(1);

          expect(this.onMessage.firstCall.args[0]).to.not.equal(payload);
          expect(this.onMessage.firstCall.args[0]).to.deep.equal(payload);
        });

        it('resolves when dest replies with ack', async function() {
          const sendMessageP = this.srcSendMessage('messageType', 'hello');

          expect(this.onMessage.callCount).to.equal(0);

          await sendMessageP;
          expect(this.onMessage.callCount).to.equal(1);
          expect(this.onMessage.firstCall.args).to.deep.equal(['hello']);
        });

        it('triggers, on dest, a cb for the matching type', async function() {
          const barCb = this.sandbox.stub();
          this.destListen('bar', barCb);

          await this.srcSendMessage('bar', 'soap');

          expect(this.onMessage.callCount).to.equal(0);
          expect(barCb.callCount).to.equal(1);
          expect(barCb.firstCall.args).to.deep.equal(['soap']);
        });

        it('supports single listener for a type', async function() {
          const barCb1 = this.sandbox.stub();
          const barCb2 = this.sandbox.stub();
          this.destListen('bar', barCb1);
          this.destListen('bar', barCb2);

          await this.srcSendMessage('bar', 'soap');

          expect(barCb1.callCount).to.equal(0);
          expect(barCb2.callCount).to.equal(1);
          expect(barCb2.firstCall.args).to.deep.equal(['soap']);
        });

        describe('dest message handling', () => {
          [
            {specName: 'undefined', payload: null, expectDeep: false},
            {specName: 'null', payload: undefined, expectDeep: false},
            {specName: 'string', payload: 'something', expectDeep: false},
            {specName: 'number', payload: 3.14, expectDeep: false},
            {specName: 'object', payload: {some: 'object'}, expectDeep: true},
            {specName: 'array', payload: ['a', 'b', 'c'], expectDeep: true},
          ].forEach(({specName, payload, expectDeep}) => {
            it(specName, async function() {
              this.destListen('bar', () => payload);

              const response = await this.srcSendMessage('bar', 'soap');

              if (expectDeep) {
                expect(response).to.deep.equal(payload);
              } else {
                expect(response).to.equal(payload);
              }
            });
          });
        });

        it('unregister a callback with unlisten', async function() {
          const barCb = this.sandbox.stub();
          this.destListen('bar', barCb);
          await this.srcSendMessage('bar', 'soap');
          expect(barCb.callCount).to.equal(1);
          this.destUnlisten('bar');

          await this.srcSendMessage('bar', 'soap');

          expect(barCb.callCount).to.equal(1);
        });

        it('ignores foreign postMessages', async function() {
          const barCb = this.sandbox.stub();
          this.destListen('bar', barCb);
          const fakeMessage: Message = {
            type: 'bar',
            id: 0,
            payload: '',
            error: null,
            isReply: false,
          };
          this.destWindow.postMessage(JSON.stringify(fakeMessage), '*');

          // Await another message to ensure fake message was handled in dest.
          await this.srcSendMessage('not-bar');
          expect(barCb.callCount).to.equal(0);
        });

        it('processes messages while waiting for a reponse', async function() {
          let resolveLongTask = null;
          this.destListen('longTask', () => {
            return new Promise((resolve) => {
              resolveLongTask = resolve;
            });
          });

          const longTaskCb = this.sandbox.stub();
          const longTaskPromise = this.srcSendMessage('longTask', 'hello').then(
            longTaskCb
          );

          await this.srcSendMessage('foo');
          await this.destSendMessage('bar');
          expect(longTaskCb.callCount).to.equal(0);

          resolveLongTask();
          await longTaskPromise;
          expect(longTaskCb.callCount).to.equal(1);
        });
      });
    });
  });
} // namespace tf_plugin.test
