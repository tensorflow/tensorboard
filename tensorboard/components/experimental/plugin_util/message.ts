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
/**
 * PLEASE KEEP THIS FILE IN SYNC WITH plugin_lib/message.ts.
 * The differences are:
 * plugin_lib/message.ts
 * - uses module style
 * - uses tf_ts_library whose srcs require to end with .ts
 * plugin_util/message.ts
 * - uses namespace and tf_web_library
 * - gets combined as JS before sync and requires to be end with ".js" internally.
 * Because of above requirements, we bypass by copying the source.
 */
/**
 * This file defines utilities shared by TensorBoard (plugin host) and the
 * dynamic plugin library, used by plugin authors.
 */
/**
 * [1]: Using string to access property prevents JSCompiler mangling and make the
 * property stable across different versions of a bundle.
 */
namespace tb_plugin.lib.DO_NOT_USE_INTERNAL {
  export type PayloadType =
    | null
    | undefined
    | string
    | string[]
    | boolean
    | boolean[]
    | number
    | number[]
    | object
    | object[];

  export interface Message {
    type: string;
    id: number;
    payload: PayloadType;
    error: string | null;
    isReply: boolean;
  }

  export type MessageType = string;
  export type MessageCallback = (payload: any) => any;

  interface PromiseResolver {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
  }

  export class IPC {
    private id = 0;
    private readonly responseWaits = new Map<number, PromiseResolver>();
    private readonly listeners = new Map<MessageType, MessageCallback>();

    constructor(private port: MessagePort) {
      this.port.addEventListener('message', (event) => this.onMessage(event));
    }

    listen(type: MessageType, callback: MessageCallback) {
      this.listeners.set(type, callback);
    }

    unlisten(type: MessageType) {
      this.listeners.delete(type);
    }

    private async onMessage(event: MessageEvent) {
      const message = JSON.parse(event.data) as Message;
      // Please see [1] for reason why we use string to access the property.
      const type = message['type'];
      const id = message['id'];
      const payload = message['payload'];
      const error = message['error'];
      const isReply = message['isReply'];

      if (isReply) {
        if (!this.responseWaits.has(id)) return;
        const {resolve, reject} = this.responseWaits.get(id) as PromiseResolver;
        this.responseWaits.delete(id);
        if (error) {
          reject(new Error(error));
        } else {
          resolve(payload);
        }
        return;
      }

      let replyPayload = null;
      let replyError = null;
      if (this.listeners.has(type)) {
        const callback = this.listeners.get(type) as MessageCallback;
        try {
          const result = await callback(payload);
          replyPayload = result;
        } catch (e) {
          replyError = e;
        }
      }

      // Please see [1] for reason why we use string to access the property.
      const replyMessage: Message = {
        ['type']: type,
        ['id']: id,
        ['payload']: replyPayload,
        ['error']: replyError,
        ['isReply']: true,
      };
      this.postMessage(replyMessage);
    }

    private postMessage(message: Message) {
      this.port.postMessage(JSON.stringify(message));
    }

    sendMessage(type: MessageType, payload: PayloadType): Promise<PayloadType> {
      const id = this.id++;
      const message: Message = {type, id, payload, error: null, isReply: false};
      this.postMessage(message);
      return new Promise((resolve, reject) => {
        this.responseWaits.set(id, {resolve, reject});
      });
    }
  }
} // namespace tb_plugin.lib.DO_NOT_USE_INTERNAL
