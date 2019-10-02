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
namespace tb_plugin.host {
  const portIPCs = new Set<lib.DO_NOT_USE_INTERNAL.IPC>();
  const VERSION = 'experimental';
  const listeners = new Map<
    lib.DO_NOT_USE_INTERNAL.MessageType,
    lib.DO_NOT_USE_INTERNAL.MessageCallback
  >();

  // TODO(@psybuzz): replace this and the port cleanup logic in broadcast() with
  // a MutationObserver to notify us when iframes disconnect.
  const ipcToFrame = new Map<lib.DO_NOT_USE_INTERNAL.IPC, HTMLIFrameElement>();

  // The initial Window-level listener is needed to bootstrap only.
  // All further communication is done over MessagePorts.
  window.addEventListener('message', (event) => {
    if (event.data !== `${VERSION}.bootstrap`) return;
    const port = event.ports[0];
    if (!port) return;
    const frame = event.source ? event.source.frameElement : null;
    if (!frame) return;
    onBootstrap(port, frame as HTMLIFrameElement);
  });

  function onBootstrap(port: MessagePort, frame: HTMLIFrameElement) {
    const portIPC = new lib.DO_NOT_USE_INTERNAL.IPC(port);
    portIPCs.add(portIPC);
    ipcToFrame.set(portIPC, frame);
    port.start();

    for (const [type, callback] of listeners) {
      portIPC.listen(type, callback);
    }
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
  export function broadcast(
    type: lib.DO_NOT_USE_INTERNAL.MessageType,
    payload: lib.DO_NOT_USE_INTERNAL.PayloadType
  ): Promise<lib.DO_NOT_USE_INTERNAL.PayloadType[]> {
    for (const ipc of portIPCs) {
      if (!ipcToFrame.get(ipc).isConnected) {
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
  export function listen(
    type: lib.DO_NOT_USE_INTERNAL.MessageType,
    callback: lib.DO_NOT_USE_INTERNAL.MessageCallback
  ) {
    listeners.set(type, callback);
    for (const ipc of portIPCs) {
      ipc.listen(type, callback);
    }
  }

  /**
   * Unsubscribes to messages of a type specified for all frames.
   */
  export function unlisten(type: lib.DO_NOT_USE_INTERNAL.MessageType) {
    listeners.delete(type);
    for (const ipc of portIPCs) {
      ipc.unlisten(type);
    }
  }
} // namespace tb_plugin.host
