/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {filter, map, startWith} from 'rxjs/operators';
import {State} from '../../../app_state';
import {Run} from '../../../runs/types';
import {
  getCardMetadata,
  getCardTimeSeries,
  getRunMap,
} from '../../../selectors';
import {MetricsDataSource} from '../../data_source/types';
import {CardMetadata} from '../../types';

export interface DataDownloadDialogData {
  cardId: string;
}

@Component({
  standalone: false,
  selector: 'data_download_dialog',
  template: `<data_download_dialog_component
    [cardMetadata]="cardMetadata$ | async"
    [runs]="runs$ | async"
    [selectedRunId]="selectedRunId$ | async"
    [downloadUrlCsv]="downloadUrlCsv$ | async"
    [downloadUrlJson]="downloadUrlJson$ | async"
    (runSelected)="selectedRunId$.next($event)"
  ></data_download_dialog_component>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataDownloadDialogContainer {
  readonly runs$: Observable<Run[]>;
  readonly cardMetadata$: Observable<CardMetadata>;

  readonly selectedRunId$ = new BehaviorSubject<string | null>(null);
  readonly downloadUrlCsv$: Observable<string | null>;
  readonly downloadUrlJson$: Observable<string | null>;

  constructor(
    store: Store<State>,
    dataSource: MetricsDataSource,
    @Inject(MAT_DIALOG_DATA) data: DataDownloadDialogData
  ) {
    this.cardMetadata$ = store
      .select(getCardMetadata, data.cardId)
      .pipe(
        filter((metadata) => Boolean(metadata))
      ) as Observable<CardMetadata>;

    this.downloadUrlCsv$ = combineLatest([
      store.select(getCardMetadata, data.cardId),
      this.selectedRunId$,
    ]).pipe(
      map(([metadata, selectedRunId]): string | null => {
        if (!metadata || !selectedRunId) return null;
        return dataSource.downloadUrl(
          metadata.plugin,
          metadata.tag,
          selectedRunId!,
          'csv'
        );
      }),
      startWith<string | null>(null)
    );
    this.downloadUrlJson$ = combineLatest([
      store.select(getCardMetadata, data.cardId),
      this.selectedRunId$,
    ]).pipe(
      map(([metadata, selectedRunId]): string | null => {
        if (!metadata || !selectedRunId) return null;
        return dataSource.downloadUrl(
          metadata.plugin,
          metadata.tag,
          selectedRunId!,
          'json'
        );
      }),
      startWith<string | null>(null)
    );

    this.runs$ = combineLatest([
      store.select(getRunMap),
      store.select(getCardTimeSeries, data.cardId),
    ]).pipe(
      map(([runMap, runToSeries]) => {
        if (!runToSeries) return [];
        return Object.keys(runToSeries)
          .map((runId) => {
            return runMap.get(runId);
          })
          .filter(Boolean) as Run[];
      })
    );
  }
}
