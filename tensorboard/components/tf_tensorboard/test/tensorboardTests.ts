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

describe('tf-tensorboard tests', () => {
  window.HTMLImports.whenReady(() => {
    let tensorboard: any;
    beforeEach(function() {
      tensorboard = fixture('tensorboardFixture');
      tensorboard.demoDir = 'data';
      tensorboard.autoReloadEnabled = false;
    });

    it('renders injected content', function() {
      let injected = tensorboard.querySelector('#inject-me');
      chai.assert.isNotNull(injected);
    });

    it('reloads the active dashboard on request', (done) => {
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

    describe('top right global icons', function() {
      it('Clicking the reload button will call reload', function() {
        let called = false;
        tensorboard.reload = function() { called = true; };
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
            setTimeout(verify, 3);  // wait and see if it becomes true
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
});

}  // namespace tf_tensorboard
