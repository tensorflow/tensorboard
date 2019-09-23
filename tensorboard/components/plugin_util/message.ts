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

export type JsonSerializeable = string | number | object;

export interface Message {
  type: string;
  id: string;
  payload: JsonSerializeable;
  error: string | null;
}

export type MessageType = string;
export type MessageCallback = (payload: any) => any;

interface PromiseResolver {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}

export abstract class IPC {
  private idPrefix: string;
  private id = 0;
  private readonly responseWaits = new Map<string, PromiseResolver>();
  private readonly listeners = new Map<MessageType, MessageCallback>();

  constructor() {
    window.addEventListener('message', this._onMessage.bind(this));
    const randomArray = new Uint8Array(16);
    window.crypto.getRandomValues(randomArray);
    this.idPrefix = Array.from(randomArray)
      .map((int: number) => int.toString(16))
      .join('');
  }

  listen(type: MessageType, callback: MessageCallback) {
    this.listeners.set(type, callback);
  }

  unlisten(type: MessageType) {
    this.listeners.delete(type);
  }

  private async _onMessage(event: MessageEvent) {
    // There are instances where random browser extensions send messages.
    if (typeof event.data !== 'string') return;

    const message = JSON.parse(event.data) as Message;
    const callback = this.listeners.get(message.type);

    if (this.responseWaits.has(message.id)) {
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
    };
    this.postMessage(event.source, JSON.stringify(replyMessage));
  }

  private postMessage(targetWindow: Window, message: string) {
    targetWindow.postMessage(message, '*');
  }

  protected _sendMessage(
    targetWindow: Window,
    type: MessageType,
    payload: any
  ): Promise<any> {
    const id = `${this.idPrefix}_${this.id++}`;
    const message: Message = {type, id, payload, error: null};
    this.postMessage(targetWindow, JSON.stringify(message));
    return new Promise((resolve, reject) => {
      this.responseWaits.set(id, {resolve, reject});
    });
  }
}
