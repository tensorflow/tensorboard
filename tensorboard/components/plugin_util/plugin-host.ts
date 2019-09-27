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
import {IPC, MessageType, PayloadType} from './message.js';

const portIPCs = new Set<IPC>();
const VERSION = 'experimental';
const ipcToFrame = new WeakMap<IPC, HTMLIFrameElement>();

// The initial Window-level listener is needed to bootstrap only.
// All further communication is done over MessagePorts.
window.addEventListener('message', (event) => {
  if (event.data !== `${VERSION}.bootstrap`)
    return;
  const port = event.ports[0];
  if (!port)
    return;
  const frame = event.source ? event.source.frameElement : null;
  if (!frame)
    return;

  const portIPC = new IPC(port);
  portIPCs.add(portIPC);
  ipcToFrame.set(portIPC, frame as HTMLIFrameElement);
  port.start();

  // TODO: install API.
});

function _broadcast(
  type: MessageType,
  payload: PayloadType
): Promise<PayloadType[]> {
  // Clean up disconnected iframes, since they won't respond.
  for (const ipc of portIPCs) {
    if (!ipcToFrame.get(ipc).isConnected) {
      portIPCs.delete(ipc);
      ipcToFrame.delete(ipc);
    }
  }

  const ipcs = [...portIPCs];
  const promises = ipcs.map(ipc => ipc.sendMessage(type, payload));
  return Promise.all(promises);
}

export const broadcast = _broadcast;

namespace tf_plugin {

  /**
   * Sends a message to all dynamic plugins. Individual plugins decide whether
   * or not to listen.
   * @return Promise that resolves with a list of payloads from each plugin's
   *         response (or null) to the message.
   *
   * @example
   * const someList = await broadcast('some.type.guest.understands');
   * // do fun things with someList.
   */
  export const broadcast = _broadcast;

} // namespace tf_plugin
