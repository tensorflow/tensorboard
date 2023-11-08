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
import {map} from 'rxjs/operators';
import {TBHttpClient} from '../../webapp_data_source/tb_http_client';
import {Run, RunsDataSource} from './runs_data_source_types';

type BackendGetRunsResponse = string[];

function runToRunId(run: string, experimentId: string) {
  return `${experimentId}/${run}`;
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
}
