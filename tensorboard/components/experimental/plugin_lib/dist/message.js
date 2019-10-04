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
    constructor(port) {
        this.port = port;
        this.id = 0;
        this.responseWaits = new Map();
        this.listeners = new Map();
        this.port.addEventListener('message', (event) => this.onMessage(event));
    }
    listen(type, callback) {
        this.listeners.set(type, callback);
    }
    unlisten(type) {
        this.listeners.delete(type);
    }
    onMessage(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = JSON.parse(event.data);
            // Access fields via strings to prevent compilers from mangling messages.
            const type = message['type'];
            const id = message['id'];
            const payload = message['payload'];
            const error = message['error'];
            const isReply = message['isReply'];
            if (isReply) {
                if (!this.responseWaits.has(id))
                    return;
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
            let replyPayload = null;
            let replyError = null;
            if (this.listeners.has(type)) {
                const callback = this.listeners.get(type);
                try {
                    const result = yield callback(payload);
                    replyPayload = result;
                }
                catch (e) {
                    replyError = e;
                }
            }
            const replyMessage = {
                'type': type,
                'id': id,
                'payload': replyPayload,
                'error': replyError,
                'isReply': true,
            };
            this.postMessage(replyMessage);
        });
    }
    postMessage(message) {
        this.port.postMessage(JSON.stringify(message));
    }
    sendMessage(type, payload) {
        const id = this.id++;
        const message = { 'type': type, 'id': id, 'payload': payload, 'error': null, 'isReply': false };
        this.postMessage(message);
        return new Promise((resolve, reject) => {
            this.responseWaits.set(id, { resolve, reject });
        });
    }
}
