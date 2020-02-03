/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  DebuggerRunListing,
  Execution,
  ExecutionDigest,
  StackFrame,
} from '../store/debugger_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export interface StackFramesResponse {
  stack_frames: StackFrame[];
}

export interface ExecutionDigestsResponse {
  begin: number;

  end: number;

  num_digests: number;

  execution_digests: ExecutionDigest[];
}

export interface ExecutionDataResponse {
  begin: number;

  end: number;

  executions: Execution[];
}

export abstract class Tfdbg2DataSource {
  abstract fetchRuns(): Observable<DebuggerRunListing>;

  abstract fetchExecutionDigests(
    run: string,
    begin: number,
    end: number
  ): Observable<ExecutionDigestsResponse>;

  abstract fetchExecutionData(
    run: string,
    begin: number,
    end: number
  ): Observable<ExecutionDataResponse>;

  abstract fetchStackFrames(
    run: string,
    stackFrameIds: string[]
  ): Observable<StackFramesResponse>;
}

@Injectable()
export class Tfdbg2HttpServerDataSource implements Tfdbg2DataSource {
  private readonly httpPathPrefix = 'data/plugin/debugger-v2';

  constructor(private http: HttpClient) {}

  fetchRuns() {
    // TODO(cais): Once the backend uses an DataProvider that unifies tfdbg and
    // non-tfdbg plugins, switch to using `tf_backend.runStore.refresh()`.
    return this.http.get<DebuggerRunListing>(this.httpPathPrefix + '/runs');
  }

  fetchExecutionDigests(run: string, begin: number, end: number) {
    return this.http.get<ExecutionDigestsResponse>(
      this.httpPathPrefix + '/execution/digests',
      {
        params: {
          run,
          begin: String(begin),
          end: String(end),
        },
      }
    );
  }

  fetchExecutionData(run: string, begin: number, end: number) {
    return this.http.get<ExecutionDataResponse>(
      this.httpPathPrefix + '/execution/data',
      {
        params: {
          run,
          begin: String(begin),
          end: String(end),
        },
      }
    );
  }

  fetchStackFrames(run: string, stackFrameIds: string[]) {
    return this.http.get<StackFramesResponse>(
      this.httpPathPrefix + '/stack_frames/stack_frames',
      {
        params: {
          run,
          stack_frame_ids: stackFrameIds.join(','),
        },
      }
    );
  }

  // TODO(cais): Implement fetchEnvironments().
}
