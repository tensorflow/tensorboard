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
import {Observable, of, throwError} from 'rxjs';
import {catchError, map, mergeMap} from 'rxjs/operators';
import {
  HttpErrorResponse,
  TBHttpClient,
} from '../../webapp_data_source/tb_http_client';
import * as backendTypes from './runs_backend_types';
import {
  Domain,
  DomainType,
  HparamsAndMetadata,
  HparamSpec,
  HparamValue,
  MetricSpec,
  Run,
  RunsDataSource,
  RunToHparamsAndMetrics,
} from './runs_data_source_types';

const HPARAMS_HTTP_PATH_PREFIX = 'data/plugin/hparams';

type BackendGetRunsResponse = string[];

function runToRunId(run: string, experimentId: string) {
  return `${experimentId}/${run}`;
}

function transformBackendHparamSpec(
  hparamInfo: backendTypes.HparamSpec
): HparamSpec {
  let domain: Domain;
  if (backendTypes.isDiscreteDomainHparamSpec(hparamInfo)) {
    domain = {type: DomainType.DISCRETE, values: hparamInfo.domainDiscrete};
  } else if (backendTypes.isIntervalDomainHparamSpec(hparamInfo)) {
    domain = {...hparamInfo.domainInterval, type: DomainType.INTERVAL};
  } else {
    domain = {
      type: DomainType.INTERVAL,
      minValue: -Infinity,
      maxValue: Infinity,
    };
  }
  return {
    description: hparamInfo.description,
    displayName: hparamInfo.displayName,
    name: hparamInfo.name,
    type: hparamInfo.type,
    domain,
  };
}

function transformBackendMetricSpec(
  metricInfo: backendTypes.MetricSpec
): MetricSpec {
  const {name, ...otherSpec} = metricInfo;
  return {
    ...otherSpec,
    tag: name.tag,
  };
}

declare interface GetExperimentHparamRequestPayload {
  experimentName: string;
}

@Injectable()
export class TBRunsDataSource implements RunsDataSource {
  constructor(private readonly http: TBHttpClient) {}

  fetchRuns(experimentId: string): Observable<Run[]> {
    return this.http
      .get<BackendGetRunsResponse>(`/experiment/${experimentId}/data/runs`)
      .pipe(
        map((runs) => {
          return runs.map((run) => {
            return {
              id: runToRunId(run, experimentId),
              name: run,
              // Use a dummy startTime for now, until there is backend support.
              startTime: 0,
            };
          });
        })
      );
  }

  fetchHparamsMetadata(experimentId: string): Observable<HparamsAndMetadata> {
    const requestPayload: GetExperimentHparamRequestPayload = {
      experimentName: experimentId,
    };
    return this.http
      .post<backendTypes.BackendHparamsExperimentResponse>(
        `/experiment/${experimentId}/${HPARAMS_HTTP_PATH_PREFIX}/experiment`,
        requestPayload,
        {},
        'request'
      )
      .pipe(
        map((response) => {
          const colParams: backendTypes.BackendListSessionGroupRequest['colParams'] =
            [];

          for (const hparamInfo of response.hparamInfos) {
            colParams.push({hparam: hparamInfo.name});
          }
          for (const metricInfo of response.metricInfos) {
            colParams.push({metric: metricInfo.name});
          }

          const listSessionRequestParams: backendTypes.BackendListSessionGroupRequest =
            {
              experimentName: experimentId,
              allowedStatuses: [
                backendTypes.RunStatus.STATUS_FAILURE,
                backendTypes.RunStatus.STATUS_RUNNING,
                backendTypes.RunStatus.STATUS_SUCCESS,
                backendTypes.RunStatus.STATUS_UNKNOWN,
              ],
              colParams,
              startIndex: 0,
              // arbitrary large number so it does not get clipped.
              sliceSize: 1e6,
            };

          return {
            experimentHparamsInfo: response,
            listSessionRequestParams,
          };
        }),
        mergeMap(({experimentHparamsInfo, listSessionRequestParams}) => {
          return this.http
            .post<backendTypes.BackendListSessionGroupResponse>(
              `/experiment/${experimentId}/${HPARAMS_HTTP_PATH_PREFIX}/session_groups`,
              listSessionRequestParams,
              {},
              'request'
            )
            .pipe(
              map((sessionGroupsList) => {
                return {experimentHparamsInfo, sessionGroupsList};
              })
            );
        }),
        map(({experimentHparamsInfo, sessionGroupsList}) => {
          const runToHparamsAndMetrics: RunToHparamsAndMetrics = {};

          // Reorganize the sessionGroup/session into run to <hparams,
          // metrics>.
          for (const sessionGroup of sessionGroupsList.sessionGroups) {
            const hparams: HparamValue[] = Object.entries(
              sessionGroup.hparams
            ).map((keyValue) => {
              const [hparam, value] = keyValue;
              return {name: hparam, value};
            });

            for (const session of sessionGroup.sessions) {
              for (const metricValue of session.metricValues) {
                const runName = metricValue.name.group
                  ? `${session.name}/${metricValue.name.group}`
                  : session.name;
                const runId = `${experimentId}/${runName}`;
                const hparamsAndMetrics = runToHparamsAndMetrics[runId] || {
                  metrics: [],
                  hparams,
                };
                hparamsAndMetrics.metrics.push({
                  tag: metricValue.name.tag,
                  trainingStep: metricValue.trainingStep,
                  value: metricValue.value,
                });
                runToHparamsAndMetrics[runId] = hparamsAndMetrics;
              }
            }
          }
          return {
            hparamSpecs: experimentHparamsInfo.hparamInfos.map(
              transformBackendHparamSpec
            ),
            metricSpecs: experimentHparamsInfo.metricInfos.map(
              transformBackendMetricSpec
            ),
            runToHparamsAndMetrics,
          };
        }),
        catchError((error) => {
          // HParams plugin return 400 when there are no hparams for an
          // experiment.
          if (error instanceof HttpErrorResponse && error.status === 400) {
            return of({
              hparamSpecs: [],
              metricSpecs: [],
              runToHparamsAndMetrics: {},
            });
          }
          return throwError(error);
        })
      );
  }
}
