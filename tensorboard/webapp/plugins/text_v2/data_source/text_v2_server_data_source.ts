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
import {map} from 'rxjs/operators';
import {TBHttpClient} from '../../../webapp_data_source/tb_http_client';
import {TextV2DataSource} from './text_v2_data_source';

interface BackendRunToTagsMap {
  [runName: string]: string[];
}

interface BackendStepDatum {
  original_shape: number[];
  step: number;
  string_array: string[][];
  wall_time: number;
  truncated: boolean;
}

@Injectable()
export class TextV2ServerDataSource implements TextV2DataSource {
  private readonly httpPathPrefix = 'data/plugin/text_v2';

  constructor(private http: TBHttpClient) {}

  fetchRunToTag() {
    return this.http
      .get<BackendRunToTagsMap>(this.httpPathPrefix + '/tags')
      .pipe(
        map((runToTagObject) => {
          const runToTag = new Map<string, string[]>();
          Object.entries(runToTagObject).forEach(([runName, tags]) => {
            runToTag.set(runName, tags);
          });
          return runToTag;
        })
      );
  }

  fetchTextData(run: string, tag: string) {
    const searchParams = new URLSearchParams({run, tag});
    return this.http
      .get<BackendStepDatum[]>(
        this.httpPathPrefix + `/text?${searchParams.toString()}`
      )
      .pipe(
        map((dataList) => {
          return dataList.map((datum) => {
            return {
              originalShape: datum.original_shape,
              step: datum.step,
              stringArray: datum.string_array,
              wallTimeInMs: datum.wall_time * 1000,
              truncated: datum.truncated,
            };
          });
        })
      );
  }
}
