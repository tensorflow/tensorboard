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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class IPC {
    constructor() {
        this.id = 0;
        this.responseWaits = new Map();
        this.listeners = new Map();
        window.addEventListener('message', this.onMessage.bind(this));
        // TODO(tensorboard-team): remove this by using MessageChannel.
        const randomArray = new Uint8Array(16);
        window.crypto.getRandomValues(randomArray);
        this.idPrefix = Array.from(randomArray)
            .map((int) => int.toString(16))
            .join('');
    }
    listen(type, callback) {
        this.listeners.set(type, callback);
    }
    unlisten(type) {
        this.listeners.delete(type);
    }
    onMessage(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // There are instances where random browser extensions send messages.
            if (typeof event.data !== 'string')
                return;
            const message = JSON.parse(event.data);
            const callback = this.listeners.get(message.type);
            if (this.responseWaits.has(message.id)) {
                const { id, payload, error } = message;
                const { resolve, reject } = this.responseWaits.get(id);
                this.responseWaits.delete(id);
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve(payload);
                }
                return;
            }
            let payload = null;
            let error = null;
            if (this.listeners.has(message.type)) {
                const callback = this.listeners.get(message.type);
                try {
                    const result = yield callback(message.payload);
                    payload = result;
                }
                catch (e) {
                    error = e;
                }
            }
            const replyMessage = {
                type: message.type,
                id: message.id,
                payload,
                error,
            };
            this.postMessage(event.source, JSON.stringify(replyMessage));
        });
    }
    postMessage(targetWindow, message) {
        targetWindow.postMessage(message, '*');
    }
    sendMessageToWindow(targetWindow, type, payload) {
        const id = `${this.idPrefix}_${this.id++}`;
        const message = { type, id, payload, error: null };
        this.postMessage(targetWindow, JSON.stringify(message));
        return new Promise((resolve, reject) => {
            this.responseWaits.set(id, { resolve, reject });
        });
    }
}
