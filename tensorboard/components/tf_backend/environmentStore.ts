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
import * as _ from 'lodash';
import {BaseStore} from './baseStore';
import {getRouter} from './router';

interface Environment {
  dataLocation: string;
  windowTitle: string;
  /** Name of the experiment (if available). */
  experimentName?: string;
  /** A description of the experiment (if available). */
  experimentDescription?: string;
  /** Creation timestamp for the experiment (if available). */
  creationTime?: number;
}

export class EnvironmentStore extends BaseStore {
  private environment: Environment;
  load() {
    const url = getRouter().environment();
    return this.requestManager.request(url).then((result) => {
      const environment: Environment = {
        dataLocation: result.data_location,
        windowTitle: result.window_title,
      };
      if (result.experiment_name !== undefined) {
        environment.experimentName = result.experiment_name;
      }
      if (result.experiment_description !== undefined) {
        environment.experimentDescription = result.experiment_description;
      }
      if (result.creation_time !== undefined) {
        environment.creationTime = result.creation_time;
      }
      if (_.isEqual(this.environment, environment)) return;
      this.environment = environment;
      this.emitChange();
    });
  }
  public getDataLocation(): string {
    return this.environment ? this.environment.dataLocation! : '';
  }
  public getWindowTitle(): string {
    return this.environment ? this.environment.windowTitle! : '';
  }
  public getExperimentName(): string {
    return this.environment ? this.environment.experimentName! : '';
  }
  public getExperimentDescription(): string {
    return this.environment ? this.environment.experimentDescription! : '';
  }
  public getCreationTime(): number | null {
    return this.environment ? this.environment.creationTime! : null;
  }
}

export const environmentStore = new EnvironmentStore();
