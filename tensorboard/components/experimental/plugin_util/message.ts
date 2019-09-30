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
 * This file defines utilities shared by TensorBoard (plugin host) and the
 * dynamic plugin library, used by plugin authors.
 */

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
    this.port = port;
    port.addEventListener('message', this.onMessage.bind(this));
  }

  listen(type: MessageType, callback: MessageCallback) {
    this.listeners.set(type, callback);
  }

  unlisten(type: MessageType) {
    this.listeners.delete(type);
  }

  private async onMessage(event: MessageEvent) {
    const message = JSON.parse(event.data) as Message;
    const callback = this.listeners.get(message.type);

    if (message.isReply) {
      if (!this.responseWaits.has(message.id)) return;
      const {id, payload, error} = message;
      const {resolve, reject} = this.responseWaits.get(id);
      this.responseWaits.delete(id);
      if (error) {
        reject(new Error(error));
      } else {
        resolve(payload);
      }
      return;
    }

    let payload = null;
    let error = null;
    if (this.listeners.has(message.type)) {
      const callback = this.listeners.get(message.type);
      try {
        const result = await callback(message.payload);
        payload = result;
      } catch (e) {
        error = e;
      }
    }
    const replyMessage: Message = {
      type: message.type,
      id: message.id,
      payload,
      error,
      isReply: true,
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
