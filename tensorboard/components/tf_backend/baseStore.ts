/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.
+
+Licensed under the Apache License, Version 2.0 (the "License");
+you may not use this file except in compliance with the License.
+You may obtain a copy of the License at
+
+    http://www.apache.org/licenses/LICENSE-2.0
+
+Unless required by applicable law or agreed to in writing, software
+distributed under the License is distributed on an "AS IS" BASIS,
+WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
+See the License for the specific language governing permissions and
+limitations under the License.
+==============================================================================*/
namespace tf_backend {

export type Listener = () => void;

export abstract class BaseStore {
  protected requestManager: RequestManager =
      new RequestManager(1 /* simultaneous request */);
  private _listeners: Set<Listener> = new Set<Listener>();

  /**
   * Asynchronously load or reload the runs data. Listeners will be
   * invoked if this causes the runs data to change.
   *
   * @see addListener
   * @return {Promise<void>} a promise that resolves when new data have loaded.
   */
  abstract refresh(): Promise<void>;

  /**
   * Register a listener (nullary function) to be called when new runs are
   * available.
   */
  addListener(listener: Listener): void {
    this._listeners.add(listener);
  }

  /**
   * Remove a listener registered with `addListener`.
   */
  removeListener(listener: Listener): void {
    this._listeners.delete(listener);
  }

  protected emitChange(): void {
    this._listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        // ignore exceptions on the listener side.
      }
    });
  }

}

} // namespace tf_backend
