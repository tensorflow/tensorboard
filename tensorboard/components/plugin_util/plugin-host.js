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
import { IPC } from './message.js';
class HostIPC extends IPC {
    sendMessage(iframe, type, payload) {
        return this.sendMessageToWindow(iframe.contentWindow, type, payload);
    }
}
const hostIPC = new HostIPC();
const _listen = hostIPC.listen.bind(hostIPC);
const _unlisten = hostIPC.unlisten.bind(hostIPC);
const _sendMessage = hostIPC.sendMessage.bind(hostIPC);
export const sendMessage = _sendMessage;
export const listen = _listen;
export const unlisten = _unlisten;
// Export for testability.
export const _hostIPC = hostIPC;
var tf_plugin;
(function (tf_plugin) {
    /**
     * Sends a message to the frame specified.
     * @return Promise that resolves with a payload from frame in response to the message.
     *
     * @example
     * const someList = await sendMessage('v1.some.type.guest.understands');
     * // do fun things with someList.
     */
    tf_plugin.sendMessage = _sendMessage;
    /**
     * Subscribes to messages from specified frame of a type specified.
     */
    tf_plugin.listen = _listen;
    /**
     * Unsubscribes to messages from specified frame of a type specified.
     */
    tf_plugin.unlisten = _unlisten;
})(tf_plugin || (tf_plugin = {})); // namespace tf_plugin
