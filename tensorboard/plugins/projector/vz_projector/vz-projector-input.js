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
    class ProjectorInput extends vz_projector.ProjectorInputPolymer {
        /** Subscribe to be called everytime the input changes. */
        registerInputChangedListener(listener) {
            this.textChangedListeners.push(listener);
        }
        ready() {
            super.ready();
            this.inRegexMode = false;
            this.textChangedListeners = [];
            this.paperInput = this.$$('paper-input');
            this.inRegexModeButton =
                this.$$('paper-button');
            this.paperInput.setAttribute('error-message', 'Invalid regex');
            this.paperInput.addEventListener('input', () => {
                this.onTextChanged();
            });
            this.paperInput.addEventListener('keydown', event => {
                event.stopPropagation();
            });
            this.inRegexModeButton.addEventListener('click', () => this.onClickRegexModeButton());
            this.updateRegexModeDisplaySlashes();
            this.onTextChanged();
        }
        onClickRegexModeButton() {
            this.inRegexMode = this.inRegexModeButton.active;
            this.updateRegexModeDisplaySlashes();
            this.onTextChanged();
        }
        notifyInputChanged(value, inRegexMode) {
            this.textChangedListeners.forEach(l => l(value, inRegexMode));
        }
        onTextChanged() {
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
        }
        updateRegexModeDisplaySlashes() {
            const slashes = this.paperInput.querySelectorAll('.slash');
            const display = this.inRegexMode ? '' : 'none';
            for (let i = 0; i < slashes.length; i++) {
                slashes[i].style.display = display;
            }
        }
        getValue() {
            return this.paperInput.value;
        }
        getInRegexMode() {
            return this.inRegexMode;
        }
        setValue(value, inRegexMode) {
            this.inRegexModeButton.active = inRegexMode;
            this.paperInput.value = value;
            this.onClickRegexModeButton();
        }
    }
    vz_projector.ProjectorInput = ProjectorInput;
    customElements.define(ProjectorInput.prototype.is, ProjectorInput);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
