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
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import * as backendTypes from './runs_backend_types';

export {
  BackendHparamsValueType as HparamsValueType,
  DatasetType,
  DiscreteHparamValue,
  DiscreteHparamValues,
} from './runs_backend_types';

export interface HparamValue {
  name: string;
  value: backendTypes.DiscreteHparamValue | number;
}

export interface MetricValue {
  tag: string;
  trainingStep: number;
  value: number;
}

export interface RunToHparamsAndMetrics {
  [runName: string]: {
    hparams: HparamValue[];
    metrics: MetricValue[];
  };
}

export enum DomainType {
  DISCRETE,
  INTERVAL,
}

interface IntervalDomain {
  type: DomainType.INTERVAL;
  minValue: number;
  maxValue: number;
}

interface DiscreteDomain {
  type: DomainType.DISCRETE;
  values: backendTypes.DiscreteHparamValues;
}

export type Domain = IntervalDomain | DiscreteDomain;
export interface HparamSpec
  extends Omit<backendTypes.HparamSpec, 'domainInterval' | 'domainDiscrete'> {
  domain: Domain;
}

export interface MetricSpec extends Omit<backendTypes.MetricSpec, 'name'> {
  tag: string;
}

export interface HparamsAndMetadata {
  hparamSpecs: HparamSpec[];
  metricSpecs: MetricSpec[];
  runToHparamsAndMetrics: RunToHparamsAndMetrics;
}

export interface Run {
  id: string;
  name: string;
  startTime: number;
}

@Injectable({providedIn: 'root'})
export abstract class RunsDataSource {
  abstract fetchRuns(experimentId: string): Observable<Run[]>;
  abstract fetchHparamsMetadata(
    experimentId: string
  ): Observable<HparamsAndMetadata>;
}

export type RunToHParamValues = Record<
  string,
  Map<string, HparamValue['value']>
>;
