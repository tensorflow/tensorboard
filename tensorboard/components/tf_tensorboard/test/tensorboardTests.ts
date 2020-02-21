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
namespace tf_tensorboard {
  const {expect} = chai;

  declare function fixture(id: string): void;
  declare function flush(callback: Function): void;
  declare const Polymer: any;
  declare const TEST_ONLY: any;

  function checkSlottedUnderAncestor(element: Element, ancestor: Element) {
    expect(!!element.assignedSlot).to.be.true;

    const slot = element.assignedSlot as Element;
    const isContained = Polymer.dom(ancestor).deepContains(slot);
    expect(isContained).to.be.true;
  }

  describe('tf-tensorboard tests', () => {
    window.HTMLImports.whenReady(() => {
      let tensorboard: any;

      describe('base tests', () => {
        beforeEach((done) => {
          tensorboard = fixture('tensorboardFixture');
          tensorboard.demoDir = 'data';
          tensorboard.autoReloadEnabled = false;
          flush(done);
        });

        it('renders injected content', function() {
          const overview = tensorboard.querySelector('#custom-overview');
          const contentPane = tensorboard.$$('#content-pane');
          checkSlottedUnderAncestor(overview, contentPane);

          const headerItem1 = tensorboard.querySelector('#custom-header-item1');
          const headerItem2 = tensorboard.querySelector('#custom-header-item2');
          const header = tensorboard.$$('.header');
          checkSlottedUnderAncestor(headerItem1, header);
          checkSlottedUnderAncestor(headerItem2, header);
        });

        it('uses "TensorBoard-X" for title text by default', () => {
          const title = tensorboard.shadowRoot.querySelector('.toolbar-title');
          chai.assert.equal(title.textContent, 'TensorBoard-X');
        });

        it('uses div for title element by default ', () => {
          const title = tensorboard.shadowRoot.querySelector('.toolbar-title');
          chai.assert.equal(title.nodeName, 'DIV');
          chai.assert.isUndefined(title.href);
        });

        // TODO(psybuzz): Restore/remove these old tests, which fail due to broken
        // DOM ids that changed. Previously this folder's tests did not run.
        xit('reloads the active dashboard on request', (done) => {
          tensorboard.$.tabs.set('selected', 'scalars');
          setTimeout(() => {
            let called = false;
            tensorboard._selectedDashboardComponent().reload = () => {
              called = true;
            };
            tensorboard.reload();
            chai.assert.isTrue(called, 'reload was called');
            done();
          });
        });

        // TODO(psybuzz): Restore/remove these old tests, which fail due to broken
        // DOM ids that changed. Previously this folder's tests did not run.
        xdescribe('top right global icons', function() {
          it('Clicking the reload button will call reload', function() {
            let called = false;
            tensorboard.reload = function() {
              called = true;
            };
            tensorboard.$$('#reload-button').click();
            chai.assert.isTrue(called);
          });

          it('settings pane is hidden', function() {
            chai.assert.equal(tensorboard.$.settings.style['display'], 'none');
          });

          it('settings icon button opens the settings pane', function(done) {
            tensorboard.$$('#settings-button').click();
            // This test is a little hacky since we depend on polymer's
            // async behavior, which is difficult to predict.

            // keep checking until the panel is visible. error with a timeout if it
            // is broken.
            function verify() {
              if (tensorboard.$.settings.style['display'] !== 'none') {
                done();
              } else {
                setTimeout(verify, 3); // wait and see if it becomes true
              }
            }
            verify();
          });

          it('Autoreload checkbox toggle works', function() {
            let checkbox = tensorboard.$$('#auto-reload-checkbox');
            chai.assert.equal(checkbox.checked, tensorboard.autoReloadEnabled);
            let oldValue = checkbox.checked;
            checkbox.click();
            chai.assert.notEqual(oldValue, checkbox.checked);
            chai.assert.equal(checkbox.checked, tensorboard.autoReloadEnabled);
          });

          it('Autoreload checkbox contains correct interval info', function() {
            let checkbox = tensorboard.$$('#auto-reload-checkbox');
            let timeInSeconds = tensorboard.autoReloadIntervalSecs + 's';
            chai.assert.include(checkbox.innerText, timeInSeconds);
          });
        });
      });

      describe('custom path', () => {
        let sandbox: any;

        beforeEach((done) => {
          sandbox = sinon.sandbox.create();
          sandbox.stub(TEST_ONLY.lib, 'getLocation').returns({
            href: 'https://tensorboard.is/cool',
            origin: 'https://tensorboard.is',
          });

          tensorboard = fixture('tensorboardFixture');
          tensorboard.demoDir = 'data';
          tensorboard.brand = 'Custom Brand';
          tensorboard.autoReloadEnabled = false;
          tensorboard.homePath = '/awesome';

          // Branding and other components use `dom-if` which updates the dom in an
          // animation frame. Flush and remove the asynchronicity.
          flush(done);
        });

        afterEach(() => {
          sandbox.restore();
        });

        it('uses customized brand for title', () => {
          const title = tensorboard.shadowRoot.querySelector('.toolbar-title');
          chai.assert.equal(title.textContent, 'Custom Brand');
        });

        it('uses customized path for title element ', () => {
          const title = tensorboard.shadowRoot.querySelector('.toolbar-title');
          chai.assert.equal(title.nodeName, 'A');
          chai.assert.equal(title.href, 'https://tensorboard.is/awesome');
        });

        it('throws when homePath is one of bad wrong protocols', () => {
          const expectedError1 =
            "Expect 'homePath' to be of http: or https:. " +
            'javascript:alert("PWNED!")';
          chai.assert.throws(() => {
            tensorboard.homePath = 'javascript:alert("PWNED!")';
          }, expectedError1);

          const expectedError2 =
            "Expect 'homePath' to be of http: or https:. " +
            'data:text/html,<img src="HEHE" onerror="alert(\'PWNED!\')" />';
          chai.assert.throws(() => {
            tensorboard.homePath =
              'data:text/html,<img src="HEHE" onerror="alert(\'PWNED!\')" />';
          }, expectedError2);
        });

        it('throws when homePath is not a path', () => {
          const expectedError1 =
            "Expect 'homePath' be a path or have the same origin. " +
            'https://tensorboard.was/good vs. https://tensorboard.is';
          chai.assert.throws(() => {
            tensorboard.homePath = 'https://tensorboard.was/good';
          }, expectedError1);
        });
      });
    });
  });
} // namespace tf_tensorboard
