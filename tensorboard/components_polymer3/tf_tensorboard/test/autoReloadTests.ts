/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_tensorboard {
  declare function fixture(id: string): void;

  window.HTMLImports.whenReady(() => {
    Polymer({
      is: 'autoreload-test-element',
      behaviors: [AutoReloadBehavior],
    });

    describe('autoReload-behavior', function() {
      let testElement;
      const ls = window.localStorage;
      const key = AUTORELOAD_LOCALSTORAGE_KEY;
      let clock;
      let callCount: number;
      let sandbox: any;
      let isDocumentVisible = true;

      beforeEach(function() {
        ls.setItem(key, 'false'); // start it turned off so we can mutate fns
        testElement = fixture('autoReloadFixture');
        callCount = 0;
        testElement.reload = function() {
          callCount++;
        };

        sandbox = sinon.sandbox.create();
        sandbox.stub(testElement, '_isDocumentVisible', function() {
          return isDocumentVisible;
        });
      });

      afterEach(function() {
        isDocumentVisible = true;
        sandbox.restore();
      });

      before(function() {
        clock = sinon.useFakeTimers();
      });

      after(function() {
        clock.restore();
      });

      function simulateVisibilityChange(visibility) {
        isDocumentVisible = visibility;
        document.dispatchEvent(new Event('visibilitychange'));
      }

      it('reads and writes autoReload state from localStorage', function() {
        ls.removeItem(key);
        testElement = fixture('autoReloadFixture');
        chai.assert.isTrue(
          testElement.autoReloadEnabled,
          'autoReload defaults to true'
        );
        chai.assert.equal(ls.getItem(key), 'true', 'autoReload setting saved');
        testElement = fixture('autoReloadFixture');
        chai.assert.isTrue(
          testElement.autoReloadEnabled,
          'read true from localStorage'
        );
        testElement.autoReloadEnabled = false;
        chai.assert.equal(ls.getItem(key), 'false', 'autoReload setting saved');
        testElement = fixture('autoReloadFixture');
        chai.assert.isFalse(
          testElement.autoReloadEnabled,
          'read false setting properly'
        );
        testElement.autoReloadEnabled = true;
        chai.assert.equal(ls.getItem(key), 'true', 'saved true setting');
      });

      it('reloads every interval secs when autoReloading', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;
        clock.tick(1000);
        chai.assert.equal(callCount, 1, 'ticking clock triggered call');
        clock.tick(20 * 1000);
        chai.assert.equal(
          callCount,
          21,
          'ticking clock 20s triggered 20 calls'
        );
      });

      it('can cancel pending autoReload', function() {
        testElement.autoReloadIntervalSecs = 10;
        testElement.autoReloadEnabled = true;
        clock.tick(5 * 1000);
        testElement.autoReloadEnabled = false;
        clock.tick(20 * 1000);
        chai.assert.equal(callCount, 0, 'callCount is 0');
      });

      it('throws an error in absence of reload method', function() {
        testElement.reload = undefined;
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;
        chai.assert.throws(function() {
          clock.tick(5000);
        });
      });

      it('does not reload if document is not visible', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;

        clock.tick(1000);
        chai.assert.equal(callCount, 1, 'ticking clock triggered call');

        simulateVisibilityChange(false);
        clock.tick(1000);
        chai.assert.equal(
          callCount,
          1,
          'ticking clock while not visible did not trigger call'
        );
      });

      it('reloads when document becomes visible if missed reload', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;

        simulateVisibilityChange(false);
        clock.tick(1000);
        chai.assert.equal(
          callCount,
          0,
          'ticking clock while not visible did not trigger call'
        );

        simulateVisibilityChange(true);
        chai.assert.equal(callCount, 1, 'visibility change triggered call');
      });

      it('reloads when document becomes visible if missed reload, regardless of how long not visible', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;
        clock.tick(1000);
        chai.assert.equal(callCount, 1, 'ticking clock triggered call');

        // Document is not visible during time period that includes missed auto reload but is less than
        // autoReloadIntervalSecs
        clock.tick(300);
        simulateVisibilityChange(false);
        clock.tick(800);
        chai.assert.equal(
          callCount,
          1,
          'ticking clock while not visible did not trigger call'
        );

        simulateVisibilityChange(true);
        chai.assert.equal(callCount, 2, 'visibility change triggered call');
      });

      it('does not reload when document becomes visible if there was not a missed reload', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;

        clock.tick(1000);
        chai.assert.equal(callCount, 1, 'ticking clock triggered call');

        // Document is not visible during time period that does not include missed auto reload.
        simulateVisibilityChange(false);
        clock.tick(500);
        simulateVisibilityChange(true);
        chai.assert.equal(
          callCount,
          1,
          'visibility change did not trigger call'
        );
      });

      it('does not reload when document becomes visible if missed reload was already handled', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = true;

        simulateVisibilityChange(false);
        clock.tick(1200);
        chai.assert.equal(
          callCount,
          0,
          'ticking clock while not visible did not trigger call'
        );

        simulateVisibilityChange(true);
        chai.assert.equal(callCount, 1, 'visibility change triggered call');

        // Document is not visible during time period that does not include another missed reload.
        simulateVisibilityChange(false);
        clock.tick(200);
        simulateVisibilityChange(true);
        chai.assert.equal(
          callCount,
          1,
          'visibility change did not trigger call'
        );
      });

      it('does not reload when document becomes visible if auto reload is off', function() {
        testElement.autoReloadIntervalSecs = 1;
        testElement.autoReloadEnabled = false;

        simulateVisibilityChange(false);
        clock.tick(5000);

        simulateVisibilityChange(true);
        chai.assert.equal(
          callCount,
          0,
          'visibility change did not trigger call'
        );
      });
    });
  });
} // namespace tf_tensorboard
