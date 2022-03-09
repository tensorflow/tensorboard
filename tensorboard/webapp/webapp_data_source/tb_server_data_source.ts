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
import {forkJoin, from, Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {PluginsListFailureCode} from '../core/types';
import '../tb_polymer_interop_types';
import {Environment, PluginsListing} from '../types/api';
import {HttpErrorResponse, TBHttpClient} from './tb_http_client';

function getPluginsListingQueryParams(enabledExperimentPluginIds: string[]) {
  if (!enabledExperimentPluginIds.length) {
    return null;
  }

  const params = new URLSearchParams();
  for (const pluginId of enabledExperimentPluginIds) {
    params.append('experimentalPlugin', pluginId);
  }
  return params;
}

function handleError(e: any) {
  let status = PluginsListFailureCode.UNKNOWN;
  if (e instanceof HttpErrorResponse) {
    if (e.status === 404) {
      status = PluginsListFailureCode.NOT_FOUND;
    }
    if (e.status === 403) {
      status = PluginsListFailureCode.PERMISSION_DENIED;
    }
  }
  return throwError(new TBServerError(status));
}

export class TBServerError {
  constructor(public readonly failureCode: PluginsListFailureCode) {}
}

@Injectable()
export class TBServerDataSource {
  // TODO(soergel): implements WebappDataSource
  private tfBackend = document.createElement('tf-backend').tf_backend;

  constructor(private http: TBHttpClient) {}

  fetchPluginsListing(enabledExperimentPluginIds: string[]) {
    const params = getPluginsListingQueryParams(enabledExperimentPluginIds);
    const pathWithParams = params
      ? `data/plugins_listing?${params.toString()}`
      : 'data/plugins_listing';
    return this.http
      .get<PluginsListing>(pathWithParams)
      .pipe(catchError(handleError));
  }

  fetchEnvironment(): Observable<Environment> {
    // Make a request for data for the angular-specific portion of the app.
    const dataFetch = this.http.get<Environment>('data/environment');
    // Force a data load for the polymer-specific portion of the app.
    // This leads to duplicate requests but hopefully the state is temporary until
    // we migrate everything from polymer to angular.
    const polymerEnvironmentRefresh = from(
      this.tfBackend.environmentStore.refresh()
    );
    // Wait for both operations to complete and return the response from the
    // explicit http get call.
    return forkJoin([dataFetch, polymerEnvironmentRefresh]).pipe(
      map(([data]) => data),
      catchError(handleError)
    );
  }
}
