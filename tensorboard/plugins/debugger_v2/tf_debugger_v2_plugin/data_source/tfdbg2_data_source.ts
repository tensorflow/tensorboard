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
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {TBHttpClient} from '../../../../webapp/webapp_data_source/tb_http_client';
import {
  Alert,
  DebuggerRunListing,
  Execution,
  ExecutionDigest,
  GraphExecution,
  GraphExecutionDigest,
  GraphOpInfo,
  SourceFileSpec,
  StackFrame,
  StackFrameAsArray,
} from '../store/debugger_types';

// The backend route for source-file list responds with an array
// of 2-tuples: <host_name, file_path>.
export type SourceFileListResponse = Array<[string, string]>;

export interface SourceFileResponse extends SourceFileSpec {
  // Content of the source file.
  lines: string[];
}

export interface RawStackFramesResponse {
  stack_frames: StackFrameAsArray[];
}

export interface StackFramesResponse {
  stack_frames: StackFrame[];
}

/**
 * Response types related to top-level (eager) execution.
 */

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

/**
 * Response types related to intra-graph execution.
 */

export interface GraphExecutionDigestsResponse {
  begin: number;

  end: number;

  num_digests: number;

  graph_execution_digests: GraphExecutionDigest[];
}

export interface GraphExecutionDataResponse {
  begin: number;

  end: number;

  graph_executions: GraphExecution[];
}

/**
 * Response types related to alerts.
 */

export interface AlertsResponse {
  begin: number;

  end: number;

  num_alerts: number;

  alerts_breakdown: {[alert_type: string]: number};

  per_type_alert_limit: number;

  alert_type?: string;

  alerts: Alert[];
}

/**
 * Converts the array representation of a stack frame into the object
 * representation.
 */
function stackFrameAsArrayToStackFrame(array: StackFrameAsArray): StackFrame {
  return {
    host_name: array[0],
    file_path: array[1],
    lineno: array[2],
    function_name: array[3],
  };
}

export abstract class Tfdbg2DataSource {
  abstract fetchRuns(): Observable<DebuggerRunListing>;

  /**
   * Fetch the digest objects for top-level executions.
   */
  abstract fetchExecutionDigests(
    run: string,
    begin: number,
    end: number
  ): Observable<ExecutionDigestsResponse>;

  /**
   * Fetch the detailed data objects for top-level executions.
   */
  abstract fetchExecutionData(
    run: string,
    begin: number,
    end: number
  ): Observable<ExecutionDataResponse>;

  /**
   * Fetch the digest objects for intra-graph executions.
   */
  abstract fetchGraphExecutionDigests(
    run: string,
    begin: number,
    end: number,
    trace_id?: string
  ): Observable<GraphExecutionDigestsResponse>;

  /**
   * Fetch the detailed data objects for top-level executions.
   */
  abstract fetchGraphExecutionData(
    run: string,
    begin: number,
    end: number,
    trace_id?: string
  ): Observable<GraphExecutionDataResponse>;

  /**
   * Fetch the information regarding an op in a TensorFlow graph.
   * @param run Name of the run that the op belongs to.
   * @param graph_id The debugger-generated ID of the graph that contains the
   *   op. This is assumed to be the ID of the immediately-enclosing graph,
   *   i.e., *not* that of an outer graph context for the immediately-enclosing
   *   graph.
   * @param op_name Name of the op being queried for (e.g., "Dense_2/MatMul").
   */
  abstract fetchGraphOpInfo(
    run: string,
    graph_id: string,
    op_name: string
  ): Observable<GraphOpInfo>;

  /**
   * Fetch the list of source-code files that the debugged program involves.
   *
   * @param run
   */
  abstract fetchSourceFileList(run: string): Observable<SourceFileListResponse>;

  /**
   * Fetch the content of an individual source-code file.
   *
   * @param run
   * @param fileIndex 0-based index of the file to fetch. The index can be
   *   obtained by the list from `fetchSourceFileList()`.
   */
  abstract fetchSourceFile(
    run: string,
    fileIndex: number
  ): Observable<SourceFileResponse>;

  abstract fetchStackFrames(
    run: string,
    stackFrameIds: string[]
  ): Observable<StackFramesResponse>;

  /**
   * Fetch alerts.
   *
   * @param run Run name.
   * @param begin Beginning index, inclusive.
   * @param end Ending index, exclusive. Can use `begin=0` and `end=0`
   *   to retrieve only the number of alerts and their breakdown by type.
   *   Use `end=-1` to retrieve all alerts (for all alert types or only
   *   a specific alert type, depending on whether `alert_type` is specified.)
   * @param alert_type Optional filter for alert type. If specified,
   *   `begin` and `end` refer to the beginning and indices in the
   *   specific alert type.
   */
  abstract fetchAlerts(
    run: string,
    begin: number,
    end: number,
    alert_type?: string
  ): Observable<AlertsResponse>;
}

@Injectable()
export class Tfdbg2HttpServerDataSource implements Tfdbg2DataSource {
  private readonly httpPathPrefix = 'data/plugin/debugger-v2';

  constructor(private http: TBHttpClient) {}

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

  fetchGraphExecutionDigests(
    run: string,
    begin: number,
    end: number,
    trace_id?: string
  ) {
    if (trace_id !== undefined) {
      throw new Error(
        'trace_id is not implemented for fetchGraphExecutionDigests() yet'
      );
    }
    return this.http.get<GraphExecutionDigestsResponse>(
      this.httpPathPrefix + '/graph_execution/digests',
      {
        params: {
          run,
          begin: String(begin),
          end: String(end),
        },
      }
    );
  }

  fetchGraphExecutionData(
    run: string,
    begin: number,
    end: number,
    trace_id?: string
  ) {
    if (trace_id !== undefined) {
      throw new Error(
        'trace_id is not implemented for fetchGraphExecutionData() yet'
      );
    }
    return this.http.get<GraphExecutionDataResponse>(
      this.httpPathPrefix + '/graph_execution/data',
      {
        params: {
          run,
          begin: String(begin),
          end: String(end),
        },
      }
    );
  }

  fetchGraphOpInfo(run: string, graph_id: string, op_name: string) {
    return this.http.get<GraphOpInfo>(this.httpPathPrefix + '/graphs/op_info', {
      params: {
        run,
        graph_id,
        op_name,
      },
    });
  }

  fetchSourceFileList(run: string): Observable<SourceFileListResponse> {
    return this.http.get<SourceFileListResponse>(
      this.httpPathPrefix + '/source_files/list',
      {
        params: {
          run,
        },
      }
    );
  }

  fetchSourceFile(
    run: string,
    fileIndex: number
  ): Observable<SourceFileResponse> {
    return this.http.get<SourceFileResponse>(
      this.httpPathPrefix + '/source_files/file',
      {
        params: {
          run,
          index: String(fileIndex),
        },
      }
    );
  }

  fetchStackFrames(
    run: string,
    stackFrameIds: string[]
  ): Observable<StackFramesResponse> {
    return this.http
      .get<RawStackFramesResponse>(
        this.httpPathPrefix + '/stack_frames/stack_frames',
        {
          params: {
            run,
            stack_frame_ids: stackFrameIds.join(','),
          },
        }
      )
      .pipe(
        map((rawResponse: RawStackFramesResponse) => {
          return {
            stack_frames: rawResponse.stack_frames.map((stackFrameAsArray) =>
              stackFrameAsArrayToStackFrame(stackFrameAsArray)
            ),
          };
        })
      );
  }

  fetchAlerts(run: string, begin: number, end: number, alert_type?: string) {
    const params: {[param: string]: string} = {
      run,
      begin: String(begin),
      end: String(end),
    };
    if (alert_type !== undefined) {
      params['alert_type'] = alert_type;
    }
    return this.http.get<AlertsResponse>(this.httpPathPrefix + '/alerts', {
      params,
    });
  }

  // TODO(cais): Implement fetchEnvironments().
}
