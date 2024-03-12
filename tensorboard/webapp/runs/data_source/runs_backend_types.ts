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
/**
 * @fileoverview Types defined in tensorboard/plugins/hparams/api.proto and
 * tensorboard/plugins/hparams/http_api.md.
 */

export enum DatasetType {
  DATASET_UNKNOWN = 'DATASET_UNKNOWN',
  DATASET_TRAINING = 'DATASET_TRAINING',
  DATASET_VALIDATION = 'DATASET_VALIDATION',
}

export enum RunStatus {
  STATUS_UNKNOWN = 'STATUS_UNKNOWN',
  STATUS_SUCCESS = 'STATUS_SUCCESS',
  STATUS_FAILURE = 'STATUS_FAILURE',
  STATUS_RUNNING = 'STATUS_RUNNING',
}

export enum BackendHparamsValueType {
  DATA_TYPE_UNSET = 'DATA_TYPE_UNSET',
  DATA_TYPE_STRING = 'DATA_TYPE_STRING',
  DATA_TYPE_BOOL = 'DATA_TYPE_BOOL',
  DATA_TYPE_FLOAT64 = 'DATA_TYPE_FLOAT64',
}

export interface MetricName {
  tag: string;
  group: string;
}

export interface MetricSpec {
  name: MetricName;
  displayName: string;
  description: string;
  datasetType: DatasetType;
}

interface BaseHparamSpec {
  description: string;
  displayName: string;
  name: string;
  type: BackendHparamsValueType;
  differs: boolean;
}

export interface IntervalDomainHparamSpec extends BaseHparamSpec {
  domainInterval: {minValue: number; maxValue: number};
}

// https://github.com/tensorflow/tensorboard/blob/11f649a981cb840ca9193c5c6672becabb063aa6/tensorboard/plugins/hparams/summary_v2.py#L477-L491
export type DiscreteHparamValues = string[] | number[] | boolean[];

export type DiscreteHparamValue = DiscreteHparamValues[number];

export type HparamValue = DiscreteHparamValue | number;

export interface DiscreteDomainHparamSpec extends BaseHparamSpec {
  domainDiscrete: DiscreteHparamValues;
}

export type HparamSpec = IntervalDomainHparamSpec | DiscreteDomainHparamSpec;

export function isIntervalDomainHparamSpec(
  spec: HparamSpec
): spec is IntervalDomainHparamSpec {
  return spec.hasOwnProperty('domainInterval');
}

export function isDiscreteDomainHparamSpec(
  spec: HparamSpec
): spec is DiscreteDomainHparamSpec {
  return spec.hasOwnProperty('domainDiscrete');
}

export interface BackendHparamsExperimentRequest {
  experimentName: string;
  hparamsLimit: number;
  includeMetrics: boolean;
}

export interface BackendHparamsExperimentResponse {
  description: string;
  hparamInfos: HparamSpec[];
  metricInfos: MetricSpec[];
  name: string;
  timeCreatedSecs: number;
  user: string;
}

interface HparamsColFilterParams {
  hparam: string;
  includeInResult: boolean;
}

interface MetricsColFilterParams {
  metric: MetricName;
  includeInResult: boolean;
}

export interface BackendListSessionGroupRequest {
  experimentName: string;
  allowedStatuses: RunStatus[];
  colParams: Array<HparamsColFilterParams | MetricsColFilterParams>;
  startIndex: number;
  sliceSize: number;
  includeMetrics?: boolean;
}

export interface Session {
  endTimeSecs: number;
  metricValues: MetricsValue[];
  modelUri: string;
  monitorUrl: string;
  name: string;
  startTimeSecs: number;
  status: RunStatus;
}

export interface MetricsValue {
  name: MetricName;
  trainingStep: number;
  value: number;
  wallTimeSecs: number;
}

export interface SessionGroup {
  name: string;
  hparams: {[hparamName: string]: DiscreteHparamValue | number};
  sessions: Session[];
}

export interface BackendListSessionGroupResponse {
  sessionGroups: SessionGroup[];
  totalSize: number;
}
