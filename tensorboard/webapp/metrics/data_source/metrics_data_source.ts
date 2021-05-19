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
import {forkJoin, Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';

import {LocalStorage} from '../../util/local_storage';
import {TBHttpClient} from '../../webapp_data_source/tb_http_client';
import {TooltipSort} from '../internal_types';
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
  PersistableSettings,
} from './types';

const HTTP_PATH_PREFIX = 'data/plugin/timeseries';
const LOCAL_STORAGE_KEY = '_tb_global_settings';

/**
 * `declare` so it does not get mangled or mangled differently when
 * compiler changes.
 */
declare interface SerializableSettings {
  scalarSmoothing?: number;
  tooltipSort?: string;
  ignoreOutliers?: boolean;
}

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
          frontendTagRunSampledInfo[tag] = buildRunIdKeyedObject<
            RunSampledInfo
          >(tagRunSampledInfo[tag], experimentId);
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
        const {tagDescriptions, tagRunSampledInfo} = experimentTagMetadata[
          plugin
        ];
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
    private readonly localStorage: LocalStorage
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
    return forkJoin(fetches).pipe(
      map((results) => buildCombinedTagMetadata(results))
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
      const {
        experimentIds,
        ...requestRest
      } = request as MultiRunTimeSeriesRequest;
      const perExperimentRequests = experimentIds.map((experimentId) => {
        return this.fetchTimeSeriesBackendRequest(requestRest, experimentId);
      });
      return forkJoin(perExperimentRequests).pipe(
        map((perExperimentResults) => {
          const {
            runToSeries,
            error,
            ...responseRest
          } = perExperimentResults[0].response;
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

  private serializeSettings(settings: Partial<PersistableSettings>): string {
    const serializableSettings: SerializableSettings = {
      ignoreOutliers: settings.ignoreOutliers,
      scalarSmoothing: settings.scalarSmoothing,
      // TooltipSort is a string enum and has string values; no need to
      // serialize it differently to account for their unintended changes.
      tooltipSort: settings.tooltipSort,
    };
    return JSON.stringify(serializableSettings);
  }

  private deserializeSettings(
    serialized: string
  ): Partial<PersistableSettings> {
    const settings: Partial<PersistableSettings> = {};
    let unsanitizedObject: Record<string, string | number | boolean>;
    try {
      unsanitizedObject = JSON.parse(serialized) as Record<
        string,
        string | number | boolean
      >;
    } catch (e) {
      return settings;
    }

    if (
      unsanitizedObject.hasOwnProperty('scalarSmoothing') &&
      typeof unsanitizedObject.scalarSmoothing === 'number'
    ) {
      settings.scalarSmoothing = unsanitizedObject.scalarSmoothing;
    }

    if (
      unsanitizedObject.hasOwnProperty('ignoreOutliers') &&
      typeof unsanitizedObject.ignoreOutliers === 'boolean'
    ) {
      settings.ignoreOutliers = unsanitizedObject.ignoreOutliers;
    }

    if (
      unsanitizedObject.hasOwnProperty('tooltipSort') &&
      typeof unsanitizedObject.tooltipSort === 'string'
    ) {
      let value: TooltipSort | null = null;
      switch (unsanitizedObject.tooltipSort) {
        case TooltipSort.ASCENDING:
          value = TooltipSort.ASCENDING;
          break;
        case TooltipSort.DESCENDING:
          value = TooltipSort.DESCENDING;
          break;
        case TooltipSort.DEFAULT:
          value = TooltipSort.DEFAULT;
          break;
        case TooltipSort.NEAREST:
          value = TooltipSort.NEAREST;
          break;
        default:
        // Deliberately fallthrough; may have TooltipSort from a newer version
        // of TensorBoard where there is an enum that this version is unaware
        // of.
      }
      if (value !== null) {
        settings.tooltipSort = value;
      }
    }

    return settings;
  }

  setSettings(partialSetting: Partial<PersistableSettings>): Observable<void> {
    return this.getSettings().pipe(
      tap((currentPartialSettings) => {
        this.localStorage.setItem(
          LOCAL_STORAGE_KEY,
          this.serializeSettings({...currentPartialSettings, ...partialSetting})
        );
      }),
      map(() => void null)
    );
  }

  getSettings(): Observable<Partial<PersistableSettings>> {
    const persisted = this.localStorage.getItem(LOCAL_STORAGE_KEY) ?? '{}';
    return of(this.deserializeSettings(persisted));
  }
}

export const TEST_ONLY = {
  LOCAL_STORAGE_KEY,
};
