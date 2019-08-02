/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_backend {

export enum Mode {
  DB,
  LOGDIR,
}

interface Environment {
  dataLocation: string,
  mode: Mode,
  windowTitle: string,
}

export class EnvironmentStore extends BaseStore {
  private environment: Environment;

  load() {
    const url = tf_backend.getRouter().environment();
    return this.requestManager.request(url).then(result => {
      const environment = {
        dataLocation: result.data_location,
        mode: result.mode == 'db' ? Mode.DB : Mode.LOGDIR,
        windowTitle: result.window_title,
      };
      if (_.isEqual(this.environment, environment)) return;

      this.environment = environment;
      this.emitChange();
    });
  }

  public getDataLocation(): string {
    return this.environment ? this.environment.dataLocation : '';
  }

  public getMode(): Mode {
    return this.environment ? this.environment.mode : null;
  }

  public getWindowTitle(): string {
    return this.environment ? this.environment.windowTitle : '';
  }
}

export const environmentStore = new EnvironmentStore();

}  // namespace tf_backend
