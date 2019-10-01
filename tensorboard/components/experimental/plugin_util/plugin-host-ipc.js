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
var tb_plugin;
(function (tb_plugin) {
    var host;
    (function (host) {
        const portIPCs = new Set();
        const VERSION = 'experimental';
        const listeners = new Map();
        // TODO(@psybuzz): replace this and the port cleanup logic in broadcast() with
        // a MutationObserver to notify us when iframes disconnect.
        const ipcToFrame = new Map();
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
            onBootstrap(port, frame);
        });
        function onBootstrap(port, frame) {
            const portIPC = new tb_plugin.lib.DO_NOT_USE_INTERNAL.IPC(port);
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
        function broadcast(type, payload) {
            for (const ipc of portIPCs) {
                if (!ipcToFrame.get(ipc).isConnected) {
                    portIPCs.delete(ipc);
                    ipcToFrame.delete(ipc);
                }
            }
            const promises = [...portIPCs].map((ipc) => ipc.sendMessage(type, payload));
            return Promise.all(promises);
        }
        host.broadcast = broadcast;
        /**
         * Subscribes to messages of a type specified for all frames.
         */
        function listen(type, callback) {
            listeners.set(type, callback);
            for (const ipc of portIPCs) {
                ipc.listen(type, callback);
            }
        }
        host.listen = listen;
        /**
         * Unsubscribes to messages of a type specified for all frames.
         */
        function unlisten(type) {
            listeners.delete(type);
            for (const ipc of portIPCs) {
                ipc.unlisten(type);
            }
        }
        host.unlisten = unlisten;
    })(host = tb_plugin.host || (tb_plugin.host = {}));
})(tb_plugin || (tb_plugin = {})); // namespace tb_plugin.host
