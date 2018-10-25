/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
var vz_line_chart;
(function(vz_line_chart) {

/**
 * Created drag interaction with ability to disable touch drags.
 * It uses JavaScript, as opposed to TypeScript, in order to use and make key
 * changes to few properties and methods.
 * TODO(https://github.com/palantir/plottable/issues/3479): Use the public API
 * for disabling the touch interactions.
 */
vz_line_chart.Drag = class Drag extends Plottable.Interactions.Drag {
  constructor({enableTouch = true} = {}) {
    super();
    this._enableTouch = enableTouch;
  }

  _anchor(component) {
    super._anchor(component);
    if (!this._enableTouch) {
      this._touchDispatcher.offTouchStart(this._touchStartCallback);
      this._touchDispatcher.offTouchMove(this._touchMoveCallback);
      this._touchDispatcher.offTouchEnd(this._touchEndCallback);
    }
  }
}

})(vz_line_chart || (vz_line_chart = {}))
