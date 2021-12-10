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
import {Injectable} from '@angular/core';
import {IPC, MessageCallback, MessageType, PayloadType} from './message';

/**
 * Registers metadata associated with a plugin iframe upon creation. Plugins
 * registered with this do not necessarily use IPC.
 */
export function registerPluginIframe(
  frame: HTMLIFrameElement,
  pluginName: string
) {
  pluginMetadata.set(frame, {pluginName});
}

const pluginMetadata = new WeakMap<HTMLIFrameElement, PluginMetadata>();
export type PluginMetadata = {
  pluginName: string;
};

/**
 * The `context` is only null in the case of a 'removeDom' plugin that gets
 * removed after it posts a message, and before the host has responded.
 */
export type PluginHostCallback = (
  context: PluginMetadata | null,
  data: any
) => any;

const portIPCs = new Set<IPC>();
const VERSION = 'experimental';
const listeners = new Map<MessageType, PluginHostCallback>();

// TODO(@psybuzz): replace this and the port cleanup logic in broadcast() with
// a MutationObserver to notify us when iframes disconnect.
const ipcToFrame = new Map<IPC, HTMLIFrameElement>();

// The initial Window-level listener is needed to bootstrap only.
// All further communication is done over MessagePorts.
window.addEventListener('message', (event) => {
  if (event.data !== `${VERSION}.bootstrap`) return;
  const port = event.ports[0];
  if (!port) return;
  const frame = event.source ? (event.source as any).frameElement : null;
  if (!frame) return;
  onBootstrap(port, frame as HTMLIFrameElement);
});

function onBootstrap(port: MessagePort, frame: HTMLIFrameElement) {
  const portIPC = new IPC(port);
  portIPCs.add(portIPC);
  ipcToFrame.set(portIPC, frame);
  port.start();
  for (const [type, callback] of listeners) {
    const callbackWithContext = wrapCallbackWithContext(callback, portIPC);
    portIPC.listen(type, callbackWithContext);
  }
}

/**
 * Provides context data from the IPC to the callback.
 */
function wrapCallbackWithContext(
  callback: PluginHostCallback,
  ipc: IPC
): MessageCallback {
  return (payload: PayloadType) => {
    const frame = ipcToFrame.get(ipc)!;
    const context = pluginMetadata.get(frame) || null;
    return callback(context, payload);
  };
}

/**
 * Sends a message to all frames. Individual frames decide whether or not to
 * listen.
 * @return Promise that resolves with a list of payloads from each plugin's
 *         response (or null) to the message.
 *
 * @example
 * const someList = await broadcast('v1.some.type.guest.understands');
 * // do fun things with someList.
 */
function broadcast(
  type: MessageType,
  payload: PayloadType
): Promise<PayloadType[]> {
  for (const ipc of portIPCs) {
    if (!ipcToFrame.get(ipc)!.isConnected) {
      portIPCs.delete(ipc);
      ipcToFrame.delete(ipc);
    }
  }
  const promises = [...portIPCs].map((ipc) => ipc.sendMessage(type, payload));
  return Promise.all(promises);
}

/**
 * Subscribes to messages of a type specified for all frames.
 */
function listen(type: MessageType, callback: PluginHostCallback) {
  listeners.set(type, callback);
  for (const ipc of portIPCs) {
    const callbackWithContext = wrapCallbackWithContext(callback, ipc);
    ipc.listen(type, callbackWithContext);
  }
}

/**
 * Unsubscribes to messages of a type specified for all frames.
 */
function unlisten(type: MessageType) {
  listeners.delete(type);
  for (const ipc of portIPCs) {
    ipc.unlisten(type);
  }
}

@Injectable()
export class Ipc {
  broadcast(type: MessageType, payload: PayloadType): Promise<PayloadType[]> {
    return broadcast(type, payload);
  }

  listen(type: MessageType, callback: PluginHostCallback): void {
    listen(type, callback);
  }

  unlisten(type: MessageType): void {
    unlisten(type);
  }
}
