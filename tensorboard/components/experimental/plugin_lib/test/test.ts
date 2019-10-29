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

async function createIframe(): Promise<HTMLIFrameElement> {
  return new Promise<HTMLIFrameElement>((resolve) => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    document.body.appendChild(iframe);
    iframe.src = './testable-iframe.html';
    iframe.onload = () => resolve(iframe);
  });
}

describe('plugin lib integration', () => {
  const {expect} = chai;

  beforeEach(async function() {
    this.sandbox = sinon.sandbox.create({useFakeServer: true});
    this.sandbox.server.respondImmediately = true;
    this.iframe = await createIframe();
    this.lib = (this.iframe.contentWindow as any).plugin_lib;
    this.libInternal = (this.iframe.contentWindow as any).plugin_internal;
  });

  afterEach(function() {
    document.body.removeChild(this.iframe);
    this.sandbox.restore();
  });

  describe('lib.run', () => {
    describe('#getRuns', () => {
      it('returns list of runs', async function() {
        this.sandbox
          .stub(tf_backend.runsStore, 'getRuns')
          .returns(['foo', 'bar', 'baz']);

        const runs = await this.lib.runs.getRuns();
        expect(runs).to.deep.equal(['foo', 'bar', 'baz']);
      });
    });
    describe('#setOnRunsChanged', () => {
      it('lets plugins subscribe to runs change', async function() {
        const runsChanged = this.sandbox.stub();
        const promise = new Promise((resolve) => {
          this.lib.runs.setOnRunsChanged(resolve);
        }).then(runsChanged);
        this.sandbox.server.respondWith([
          200,
          {'Content-Type': 'application/json'},
          '["foo", "bar"]',
        ]);

        await tf_backend.runsStore.refresh();
        await promise;

        expect(runsChanged).to.have.been.calledOnce;
        expect(runsChanged).to.have.been.calledWith(['foo', 'bar']);
      });
      it('lets plugins unsubscribe to runs change', async function() {
        const runsChanged = this.sandbox.stub();
        const promise = new Promise((resolve) => {
          this.lib.runs.setOnRunsChanged(resolve);
        }).then(runsChanged);
        this.lib.runs.setOnRunsChanged();
        this.sandbox.server.respondWith([
          200,
          {'Content-Type': 'application/json'},
          '["foo", "bar"]',
        ]);

        await tf_backend.runsStore.refresh();

        // Await another message to ensure the iframe processed the next message
        // (if any).
        await this.libInternal.sendMessage('foo');

        expect(runsChanged).to.not.have.been.called;
      });
    });
  });
});
