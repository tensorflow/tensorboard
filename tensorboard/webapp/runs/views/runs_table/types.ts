/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {ExperimentAlias} from '../../../experiments/types';
import {
  HparamValue,
  MetricValue,
} from '../../data_source/runs_data_source_types';
import {Run} from '../../store/runs_types';

export {
  DiscreteHparamValue,
  DiscreteHparamValues,
  Domain,
  DomainType,
  HparamSpec,
  HparamValue,
} from '../../data_source/runs_data_source_types';

export enum RunsTableColumn {
  CHECKBOX = 'checkbox',
  RUN_NAME = 'run_name',
  EXPERIMENT_NAME = 'experiment_name',
  RUN_COLOR = 'run_color',
}

export interface RunTableItem {
  run: Run;
  experimentAlias: ExperimentAlias;
  experimentName: string;
  selected: boolean;
  runColor: string;
  hparams: Map<string, HparamValue['value']>;
  metrics: Map<string, MetricValue['value']>;
}

export interface RunTableExperimentItem extends RunTableItem {
  run: Run & {experimentId: string};
  runColor: string;
}
