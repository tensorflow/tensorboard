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
import {Store} from '@ngrx/store';
import {forkJoin, Observable} from 'rxjs';
import {filter, map, take, withLatestFrom} from 'rxjs/operators';
import {
  getIsFeatureFlagsLoaded,
  getIsMetricsImageSupportEnabled,
} from '../../feature_flag/store/feature_flag_selectors';
import {State as FeatureFlagAppState} from '../../feature_flag/store/feature_flag_types';
import {TBHttpClient} from '../../webapp_data_source/tb_http_client';
import {
  BackendTagMetadata,
  BackendTimeSeriesRequest,
  BackendTimeSeriesResponse,
} from './metrics_backend_types';
import {
  ImageId,
  isSampledPlugin,
  isSingleRunPlugin,
  MetricsDataSource,
  MultiRunTimeSeriesRequest,
  PluginType,
  RunSampledInfo,
  RunToSeries,
  RunToTags,
  SingleRunTimeSeriesRequest,
  TagMetadata,
  TagToRunSampledInfo,
  TimeSeriesRequest,
  TimeSeriesResponse,
} from './types';

const HTTP_PATH_PREFIX = 'data/plugin/timeseries';

function parseRunId(runId: string): {run: string; experimentId: string} {
  const slashIndex = runId.indexOf('/');
  return {
    run: runId.substring(slashIndex + 1),
    experimentId: runId.substring(0, slashIndex),
  };
}

function runToRunId(run: string, experimentId: string) {
  return `${experimentId}/${run}`;
}

function buildFrontendTimeSeriesResponse(
  backendResponse: BackendTimeSeriesResponse,
  experimentId: string
): TimeSeriesResponse {
  const {runToSeries, run, ...responseRest} = backendResponse;
  const response = {...responseRest} as TimeSeriesResponse;
  if (runToSeries) {
    response.runToSeries = buildRunIdKeyedObject<RunToSeries>(
      runToSeries,
      experimentId
    );
  }
  if (run) {
    response.runId = runToRunId(run, experimentId);
  }
  return response;
}

function buildRunIdKeyedObject<T extends {}>(
  backendObject: T,
  experimentId: string
): T {
  const frontendObject = {} as Record<string, any>;
  for (const run in backendObject) {
    if (backendObject.hasOwnProperty(run)) {
      const runId = runToRunId(run, experimentId);
      frontendObject[runId] = backendObject[run];
    }
  }
  return frontendObject as T;
}

function buildFrontendTagMetadata(
  backendTagMetadata: BackendTagMetadata,
  experimentId: string
): TagMetadata {
  const tagMetadata = {} as TagMetadata;
  for (const pluginType of Object.keys(backendTagMetadata)) {
    const plugin = pluginType as PluginType;
    if (isSampledPlugin(plugin)) {
      const {tagRunSampledInfo, ...rest} = backendTagMetadata[plugin];
      const frontendTagRunSampledInfo = {} as TagToRunSampledInfo;
      for (const tag in tagRunSampledInfo) {
        if (tagRunSampledInfo.hasOwnProperty(tag)) {
          frontendTagRunSampledInfo[tag] =
            buildRunIdKeyedObject<RunSampledInfo>(
              tagRunSampledInfo[tag],
              experimentId
            );
        }
      }
      tagMetadata[plugin] = {
        ...rest,
        tagRunSampledInfo: frontendTagRunSampledInfo,
      };
    } else {
      const {runTagInfo, ...rest} = backendTagMetadata[plugin];
      tagMetadata[plugin] = {
        ...rest,
        runTagInfo: buildRunIdKeyedObject<RunToTags>(runTagInfo, experimentId),
      };
    }
  }
  return tagMetadata;
}

function buildCombinedTagMetadata(results: TagMetadata[]): TagMetadata {
  // Collate results from different experiments.
  const tagMetadata = {} as TagMetadata;
  for (const experimentTagMetadata of results) {
    for (const plugin of Object.values(PluginType)) {
      if (isSampledPlugin(plugin)) {
        tagMetadata[plugin] = tagMetadata[plugin] || {
          tagDescriptions: {},
          tagRunSampledInfo: {},
        };
        const {tagDescriptions, tagRunSampledInfo} =
          experimentTagMetadata[plugin];
        tagMetadata[plugin].tagDescriptions = {
          ...tagMetadata[plugin].tagDescriptions,
          ...tagDescriptions,
        };
        const combinedTagRunSampledInfo = tagMetadata[plugin].tagRunSampledInfo;
        for (const tag of Object.keys(tagRunSampledInfo)) {
          combinedTagRunSampledInfo[tag] = combinedTagRunSampledInfo[tag] || {};
          for (const runId of Object.keys(tagRunSampledInfo[tag])) {
            combinedTagRunSampledInfo[tag][runId] =
              tagRunSampledInfo[tag][runId];
          }
        }
      } else {
        tagMetadata[plugin] = tagMetadata[plugin] || {
          tagDescriptions: {},
          runTagInfo: {},
        };
        const {tagDescriptions, runTagInfo} = experimentTagMetadata[plugin];
        tagMetadata[plugin].tagDescriptions = {
          ...tagMetadata[plugin].tagDescriptions,
          ...tagDescriptions,
        };
        tagMetadata[plugin].runTagInfo = {
          ...tagMetadata[plugin].runTagInfo,
          ...runTagInfo,
        };
      }
    }
  }
  return tagMetadata;
}

/**
 * An implementation of MetricsDataSource that treats RunIds as identifiers
 * containing run name and experimentId.
 */
@Injectable()
export class TBMetricsDataSource implements MetricsDataSource {
  constructor(
    private readonly http: TBHttpClient,
    private readonly store: Store<FeatureFlagAppState>
  ) {}

  fetchTagMetadata(experimentIds: string[]) {
    const fetches = experimentIds.map((experimentId) => {
      const url = `/experiment/${experimentId}/${HTTP_PATH_PREFIX}/tags`;
      return this.http.get<BackendTagMetadata>(url).pipe(
        map((tagMetadata) => {
          return buildFrontendTagMetadata(tagMetadata, experimentId);
        })
      );
    });
    const isImagesSupported$ = this.store.select(getIsFeatureFlagsLoaded).pipe(
      filter(Boolean),
      take(1),
      withLatestFrom(this.store.select(getIsMetricsImageSupportEnabled)),
      map(([, isImagesSupported]) => {
        return isImagesSupported;
      })
    );
    return forkJoin(fetches).pipe(
      withLatestFrom(isImagesSupported$),
      map(([results, isImagesSupported]) => {
        const tagMetadata = buildCombinedTagMetadata(results);
        if (!isImagesSupported) {
          tagMetadata[PluginType.IMAGES] = {
            tagDescriptions: {},
            tagRunSampledInfo: {},
          };
        }
        return tagMetadata;
      })
    );
  }

  /**
   * TODO(psybuzz): we only request 1 at a time, consider updating the backend to
   * take a BackendTimeSeriesRequest instead of an array.
   */
  fetchTimeSeries(requests: TimeSeriesRequest[]) {
    const fetches = requests.map((request) => {
      // One single-run request.
      if (isSingleRunPlugin(request.plugin)) {
        const {runId, ...requestRest} = request as SingleRunTimeSeriesRequest;
        const {run, experimentId} = parseRunId(runId);
        const backendRequest = {...requestRest, run};
        return this.fetchTimeSeriesBackendRequest(
          backendRequest,
          experimentId
        ).pipe(
          map(({response, experimentId}) => {
            return buildFrontendTimeSeriesResponse(response, experimentId);
          })
        );
      }

      // One multi-run request generates many responses with different
      // 'runToSeries', 'error' fields. Combine them into one.
      const {experimentIds, ...requestRest} =
        request as MultiRunTimeSeriesRequest;
      const perExperimentRequests = experimentIds.map((experimentId) => {
        return this.fetchTimeSeriesBackendRequest(requestRest, experimentId);
      });
      return forkJoin(perExperimentRequests).pipe(
        map((perExperimentResults) => {
          const {runToSeries, error, ...responseRest} =
            perExperimentResults[0].response;
          const combinedResponse = responseRest as TimeSeriesResponse;
          for (const {response, experimentId} of perExperimentResults) {
            const frontendResponse = buildFrontendTimeSeriesResponse(
              response,
              experimentId
            );
            if (combinedResponse.error) {
              continue;
            }
            const {runToSeries, error} = frontendResponse;
            if (error) {
              combinedResponse.error = error;
              combinedResponse.runToSeries = undefined;
            } else {
              combinedResponse.runToSeries = combinedResponse.runToSeries || {};
              for (const run of Object.keys(runToSeries!)) {
                combinedResponse.runToSeries[run] = runToSeries![run];
              }
            }
          }
          return combinedResponse;
        })
      );
    });
    return forkJoin(fetches);
  }

  private fetchTimeSeriesBackendRequest(
    backendRequest: BackendTimeSeriesRequest,
    experimentId: string
  ): Observable<{response: BackendTimeSeriesResponse; experimentId: string}> {
    const body = new FormData();
    body.append('requests', JSON.stringify([backendRequest]));
    return this.http
      .post<BackendTimeSeriesResponse[]>(
        `/experiment/${experimentId}/${HTTP_PATH_PREFIX}/timeSeries`,
        body
      )
      .pipe(
        map((responses: BackendTimeSeriesResponse[]) => {
          return {response: responses[0], experimentId};
        })
      );
  }

  imageUrl(imageId: ImageId): string {
    return `${HTTP_PATH_PREFIX}/imageData?imageId=${imageId}`;
  }

  downloadUrl(
    pluginId: PluginType,
    tag: string,
    runId: string,
    downloadType: 'json' | 'csv'
  ): string {
    const {run, experimentId} = parseRunId(runId);
    let pluginAndRoute: string;
    switch (pluginId) {
      case PluginType.SCALARS:
        pluginAndRoute = 'scalars/scalars';
        break;
      default:
        throw new Error(
          `Not implemented: downloadUrl for ${pluginId} is not implemented yet`
        );
    }

    if (!experimentId) {
      throw new Error(
        'experimentId is empty; it is required to form downloadUrl.'
      );
    }
    const params = new URLSearchParams({tag, run, format: downloadType});
    return `/experiment/${experimentId}/data/plugin/${pluginAndRoute}?${params}`;
  }
}
