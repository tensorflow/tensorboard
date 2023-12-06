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
import {Observable, of} from 'rxjs';
import {Run, RunsDataSource} from './runs_data_source_types';

@Injectable()
export class TestingRunsDataSource implements RunsDataSource {
  fetchRuns(experimentId: string): Observable<Run[]> {
    return of([]);
  }
}

export function provideTestingRunsDataSource() {
  return [
    TestingRunsDataSource,
    {provide: RunsDataSource, useExisting: TestingRunsDataSource},
  ];
}
