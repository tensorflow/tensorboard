/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {map} from 'rxjs/operators';

import {
  BackendListSessionGroupResponse,
  Domain,
  DomainType,
  BackendListSessionGroupRequest,
  BackendHparamsExperimentRequest,
  BackendHparamsExperimentResponse,
  BackendHparamSpec,
  DiscreteDomainHparamSpec,
  HparamSpec,
  IntervalDomainHparamSpec,
  RunStatus,
  SessionGroup,
} from '../types';
import {TBHttpClient} from '../../webapp_data_source/tb_http_client';

const HPARAMS_HTTP_PATH_PREFIX = 'data/plugin/hparams';

function isHparamDiscrete(
  hparam: BackendHparamSpec
): hparam is DiscreteDomainHparamSpec {
  return Boolean((hparam as DiscreteDomainHparamSpec).domainDiscrete);
}

function isHparamInterval(
  hparam: BackendHparamSpec
): hparam is IntervalDomainHparamSpec {
  return Boolean((hparam as IntervalDomainHparamSpec).domainInterval);
}

function getHparamDomain(hparam: BackendHparamSpec): Domain {
  if (isHparamDiscrete(hparam)) {
    return {
      type: DomainType.DISCRETE,
      values: hparam.domainDiscrete,
    };
  }

  if (isHparamInterval(hparam)) {
    return {
      ...hparam.domainInterval,
      type: DomainType.INTERVAL,
    };
  }

  return {
    values: [],
    type: DomainType.DISCRETE,
  };
}

@Injectable()
export class HparamsDataSource {
  constructor(private readonly http: TBHttpClient) {}

  private getPrefix(experimentIds: string[]) {
    return experimentIds.length > 1 ? 'compare' : 'experiment';
  }

  private formatExperimentIds(experimentIds: string[]) {
    if (experimentIds.length === 1) {
      return experimentIds[0];
    }

    // The server does not send back experiment ids. Instead the response is formatted as
    // `[AliasNumber] ExperimentAlias/RunName`
    // By using the index as the alias we can translate associate the response with an experiment id
    // Note: The experiment id itself cannot be the alias because it may contain ':'
    return experimentIds.map((eid, index) => `${index}:${eid}`).join(',');
  }

  fetchExperimentInfo(
    experimentIds: string[],
    hparamsLimit: number
  ): Observable<HparamSpec[]> {
    const formattedExperimentIds = this.formatExperimentIds(experimentIds);

    const experimentRequest: BackendHparamsExperimentRequest = {
      experimentName: formattedExperimentIds,
      hparamsLimit,
      // The hparams feature generates its own metric data and does not require
      // the backend to calculate it.
      includeMetrics: false,
    };

    return this.http
      .post<BackendHparamsExperimentResponse>(
        `/${this.getPrefix(
          experimentIds
        )}/${formattedExperimentIds}/${HPARAMS_HTTP_PATH_PREFIX}/experiment`,
        experimentRequest,
        {},
        'request'
      )
      .pipe(
        map((response) => {
          return response.hparamInfos.map((hparam) => {
            const feHparam = {
              ...hparam,
              domain: getHparamDomain(hparam),
            };

            delete (feHparam as any).domainInterval;
            delete (feHparam as any).domainDiscrete;

            return feHparam;
          });
        })
      );
  }

  fetchSessionGroups(
    experimentIds: string[],
    hparamSpecs: HparamSpec[]
  ): Observable<SessionGroup[]> {
    const formattedExperimentIds = this.formatExperimentIds(experimentIds);

    const colParams: BackendListSessionGroupRequest['colParams'] = [];

    for (const hparamSpec of hparamSpecs) {
      colParams.push({hparam: hparamSpec.name, includeInResult: true});
    }

    const listSessionRequestParams: BackendListSessionGroupRequest = {
      experimentName: formattedExperimentIds,
      allowedStatuses: [
        RunStatus.STATUS_FAILURE,
        RunStatus.STATUS_RUNNING,
        RunStatus.STATUS_SUCCESS,
        RunStatus.STATUS_UNKNOWN,
      ],
      colParams,
      startIndex: 0,
      // arbitrary large number so it does not get clipped.
      sliceSize: 1e6,
      // The hparams feature generates its own metric data and does not require
      // the backend to calculate it.
      includeMetrics: false,
    };

    return this.http
      .post<BackendListSessionGroupResponse>(
        `/${this.getPrefix(
          experimentIds
        )}/${formattedExperimentIds}/${HPARAMS_HTTP_PATH_PREFIX}/session_groups`,
        listSessionRequestParams,
        {},
        'request'
      )
      .pipe(
        map((response) =>
          response.sessionGroups.map((sessionGroup) => {
            sessionGroup.sessions = sessionGroup.sessions.map((session) => {
              /*
               * In single experiment mode the Session.name is equal to the runName.
               * In comparison view it is `[AliasNumber] ExperimentAlias/runName`
               *
               * We store runs as experimentId/runName so it is necessary to prepend the experiment name
               * in single experiment view. "In comparison view we pass the indeces of the experimentIds
               * as the aliases in the request. That allows us to parse the indeces from the response and
               * use them to lookup the correct ids from the experimentIds argument.
               */
              if (experimentIds.length > 1) {
                const [, ...aliasAndRunName] = session.name.split(' ');
                const [experimentIndex, ...runName] = aliasAndRunName
                  .join(' ')
                  .split('/');
                session.name = [
                  // This parseInt should not be necessary because JS Arrays DO support indexing by string
                  experimentIds[parseInt(experimentIndex)],
                  ...runName,
                ].join('/');
              } else {
                session.name = [experimentIds[0], session.name].join('/');
              }
              return session;
            });
            return sessionGroup;
          })
        )
      );
  }
}
