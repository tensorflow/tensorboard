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
    var logging;
    (function (logging) {
        /** Duration in ms for showing warning messages to the user */
        var WARNING_DURATION_MS = 10000;
        var dom = null;
        var msgId = 0;
        var numActiveMessages = 0;
        function setDomContainer(domElement) {
            dom = domElement;
        }
        logging.setDomContainer = setDomContainer;
        /**
         * Updates the user message with the provided id.
         *
         * @param msg The message shown to the user. If null, the message is removed.
         * @param id The id of an existing message. If no id is provided, a unique id
         *     is assigned.
         * @param title The title of the notification.
         * @param isErrorMsg If true, the message is error and the dialog will have a
         *                   close button.
         * @return The id of the message.
         */
        function setModalMessage(msg, id, title, isErrorMsg) {
            if (id === void 0) { id = null; }
            if (title === void 0) { title = null; }
            if (isErrorMsg === void 0) { isErrorMsg = false; }
            if (dom == null) {
                console.warn('Can\'t show modal message before the dom is initialized');
                return;
            }
            if (id == null) {
                id = (msgId++).toString();
            }
            var dialog = dom.querySelector('#notification-dialog');
            dialog.querySelector('.close-button').style.display =
                isErrorMsg ? null : 'none';
            var spinner = dialog.querySelector('.progress');
            spinner.style.display = isErrorMsg ? 'none' : null;
            spinner.active = isErrorMsg ? null : true;
            dialog.querySelector('#notification-title').innerHTML = title;
            var msgsContainer = dialog.querySelector('#notify-msgs');
            if (isErrorMsg) {
                msgsContainer.innerHTML = '';
            }
            else {
                var errors = msgsContainer.querySelectorAll('.error');
                for (var i = 0; i < errors.length; i++) {
                    msgsContainer.removeChild(errors[i]);
                }
            }
            var divId = "notify-msg-" + id;
            var msgDiv = dialog.querySelector('#' + divId);
            if (msgDiv == null) {
                msgDiv = document.createElement('div');
                msgDiv.className = 'notify-msg ' + (isErrorMsg ? 'error' : '');
                msgDiv.id = divId;
                msgsContainer.insertBefore(msgDiv, msgsContainer.firstChild);
                if (!isErrorMsg) {
                    numActiveMessages++;
                }
                else {
                    numActiveMessages = 0;
                }
            }
            if (msg == null) {
                numActiveMessages--;
                if (numActiveMessages === 0) {
                    dialog.close();
                }
                msgDiv.remove();
            }
            else {
                msgDiv.innerText = msg;
                dialog.open();
            }
            return id;
        }
        logging.setModalMessage = setModalMessage;
        function setErrorMessage(errMsg, task) {
            setModalMessage(errMsg, null, 'Error ' + (task != null ? task : ''), true);
        }
        logging.setErrorMessage = setErrorMessage;
        /**
         * Shows a warning message to the user for a certain amount of time.
         */
        function setWarningMessage(msg) {
            var toast = dom.querySelector('#toast');
            toast.text = msg;
            toast.duration = WARNING_DURATION_MS;
            toast.open();
        }
        logging.setWarningMessage = setWarningMessage;
    })(logging = vz_projector.logging || (vz_projector.logging = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.logging
