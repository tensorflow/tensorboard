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
/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_projector;
(function (vz_projector) {
    // tslint:disable-next-line
    vz_projector.ProjectorInputPolymer = vz_projector.PolymerElement({ is: 'vz-projector-input', properties: { label: String, message: String } });
    /** Input control with custom capabilities (e.g. regex). */
    var ProjectorInput = /** @class */ (function (_super) {
        __extends(ProjectorInput, _super);
        function ProjectorInput() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /** Subscribe to be called everytime the input changes. */
        ProjectorInput.prototype.registerInputChangedListener = function (listener) {
            this.textChangedListeners.push(listener);
        };
        ProjectorInput.prototype.ready = function () {
            var _this = this;
            this.inRegexMode = false;
            this.textChangedListeners = [];
            this.paperInput = this.querySelector('paper-input');
            this.inRegexModeButton =
                this.querySelector('paper-button');
            this.paperInput.setAttribute('error-message', 'Invalid regex');
            this.paperInput.addEventListener('input', function () {
                _this.onTextChanged();
            });
            this.paperInput.addEventListener('keydown', function (event) {
                event.stopPropagation();
            });
            this.inRegexModeButton.addEventListener('click', function () { return _this.onClickRegexModeButton(); });
            this.updateRegexModeDisplaySlashes();
            this.onTextChanged();
        };
        ProjectorInput.prototype.onClickRegexModeButton = function () {
            this.inRegexMode = this.inRegexModeButton.active;
            this.updateRegexModeDisplaySlashes();
            this.onTextChanged();
        };
        ProjectorInput.prototype.notifyInputChanged = function (value, inRegexMode) {
            this.textChangedListeners.forEach(function (l) { return l(value, inRegexMode); });
        };
        ProjectorInput.prototype.onTextChanged = function () {
            try {
                if (this.inRegexMode) {
                    new RegExp(this.paperInput.value);
                }
            }
            catch (invalidRegexException) {
                this.paperInput.setAttribute('invalid', 'true');
                this.message = '';
                this.notifyInputChanged(null, true);
                return;
            }
            this.paperInput.removeAttribute('invalid');
            this.notifyInputChanged(this.paperInput.value, this.inRegexMode);
        };
        ProjectorInput.prototype.updateRegexModeDisplaySlashes = function () {
            var slashes = this.paperInput.querySelectorAll('.slash');
            var display = this.inRegexMode ? '' : 'none';
            for (var i = 0; i < slashes.length; i++) {
                slashes[i].style.display = display;
            }
        };
        ProjectorInput.prototype.getValue = function () {
            return this.paperInput.value;
        };
        ProjectorInput.prototype.getInRegexMode = function () {
            return this.inRegexMode;
        };
        ProjectorInput.prototype.set = function (value, inRegexMode) {
            this.inRegexModeButton.active = inRegexMode;
            this.paperInput.value = value;
            this.onClickRegexModeButton();
        };
        return ProjectorInput;
    }(vz_projector.ProjectorInputPolymer));
    vz_projector.ProjectorInput = ProjectorInput;
    document.registerElement(ProjectorInput.prototype.is, ProjectorInput);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
