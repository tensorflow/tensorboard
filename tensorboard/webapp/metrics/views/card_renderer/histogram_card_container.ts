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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import {HistogramDatum} from '../../../widgets/histogram/histogram_types';
import {buildNormalizedHistograms} from '../../../widgets/histogram/histogram_util';
import {timeSelectionChanged} from '../../actions';
import {HistogramStepDatum, PluginType} from '../../data_source';
import {
  getCardLoadState,
  getCardMetadata,
  getCardPinnedState,
  getCardTimeSeries,
  getMetricsHistogramMode,
  getMetricsSelectedTime,
  getMetricsXAxisType,
} from '../../store';
import {CardId, CardMetadata, LinkedTime} from '../../types';
import {CardRenderer} from '../metrics_view_types';
import {getTagDisplayName} from '../utils';
import {
  maybeClipSelectedTime,
  maybeSetClosestStartStep,
  ViewSelectedTime,
} from './utils';

type HistogramCardMetadata = CardMetadata & {
  plugin: PluginType.HISTOGRAMS;
  runId: string;
};

@Component({
  selector: 'histogram-card',
  template: `
    <histogram-card-component
      [loadState]="loadState$ | async"
      [title]="title$ | async"
      [tag]="tag$ | async"
      [runId]="runId$ | async"
      [data]="data$ | async"
      [mode]="mode$ | async"
      [xAxisType]="xAxisType$ | async"
      [runColorScale]="runColorScale"
      [showFullSize]="showFullSize"
      [isPinned]="isPinned$ | async"
      [selectedTime]="selectedTime$ | async"
      (onFullSizeToggle)="onFullSizeToggle()"
      (onPinClicked)="pinStateChanged.emit($event)"
      (onSelectTimeChanged)="onSelectTimeChanged($event)"
    ></histogram-card-component>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramCardContainer implements CardRenderer, OnInit {
  constructor(private readonly store: Store<State>) {}

  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Input() runColorScale!: RunColorScale;
  @Output() fullWidthChanged = new EventEmitter<boolean>();
  @Output() fullHeightChanged = new EventEmitter<boolean>();
  @Output() pinStateChanged = new EventEmitter<boolean>();

  loadState$?: Observable<DataLoadState>;
  title$?: Observable<string>;
  tag$?: Observable<string>;
  runId$?: Observable<string>;
  data$?: Observable<HistogramDatum[]>;
  mode$ = this.store.select(getMetricsHistogramMode);
  xAxisType$ = this.store.select(getMetricsXAxisType);
  showFullSize = false;
  isPinned$?: Observable<boolean>;
  selectedTime$?: Observable<ViewSelectedTime | null>;
  isSelectedTimeClipped$?: Observable<boolean>;
  steps$?: Observable<number[]>;

  private isHistogramCardMetadata(
    cardMetadata: CardMetadata
  ): cardMetadata is HistogramCardMetadata {
    const {plugin} = cardMetadata;
    return plugin === PluginType.HISTOGRAMS;
  }

  onFullSizeToggle() {
    this.showFullSize = !this.showFullSize;
    this.fullWidthChanged.emit(this.showFullSize);
    this.fullHeightChanged.emit(this.showFullSize);
  }

  /**
   * Build observables once cardId is defined (after onInit).
   */
  ngOnInit() {
    const selectCardMetadata$ = this.store.select(getCardMetadata, this.cardId);
    const cardMetadata$ = selectCardMetadata$.pipe(
      filter((cardMetadata) => {
        return !!cardMetadata && this.isHistogramCardMetadata(cardMetadata);
      }),
      map((cardMetadata) => {
        return cardMetadata as HistogramCardMetadata;
      })
    );

    const metadataAndSeries$ = combineLatest([
      cardMetadata$,
      this.store.select(getCardTimeSeries, this.cardId),
    ]);
    this.data$ = metadataAndSeries$.pipe(
      map(([cardMetadata, runToSeries]) => {
        const runId = cardMetadata.runId;
        if (!runToSeries || !runToSeries.hasOwnProperty(runId)) {
          return [];
        }
        const series = runToSeries[runId] as HistogramStepDatum[];
        const result: HistogramDatum[] = series.map((datum) => {
          const {wallTime, step} = datum;
          const bins = datum.bins.map((bin) => {
            return {x: bin.min, dx: bin.max - bin.min, y: bin.count};
          });
          return {wallTime, step, bins};
        });
        return buildNormalizedHistograms(result);
      })
    );

    this.steps$ = this.data$.pipe(
      map((data) => data.map((datum) => datum.step))
    );

    this.selectedTime$ = combineLatest([
      this.store.select(getMetricsSelectedTime),
      this.steps$,
    ]).pipe(
      map(([selectedTime, steps]) => {
        if (!selectedTime) return null;

        let minStep = Infinity;
        let maxStep = -Infinity;
        for (const step of steps) {
          minStep = Math.min(step, minStep);
          maxStep = Math.max(step, maxStep);
        }
        const viewSelectedTime = maybeClipSelectedTime(
          selectedTime,
          minStep,
          maxStep
        );

        return maybeSetClosestStartStep(viewSelectedTime, steps);
      })
    );

    this.loadState$ = this.store.select(getCardLoadState, this.cardId);

    this.tag$ = cardMetadata$.pipe(
      map((cardMetadata) => {
        return cardMetadata.tag;
      })
    );

    this.title$ = this.tag$.pipe(
      map((tag) => {
        return getTagDisplayName(tag, this.groupName);
      })
    );

    this.runId$ = cardMetadata$.pipe(
      map((cardMetadata) => {
        return cardMetadata.runId;
      })
    );

    this.isPinned$ = this.store.select(getCardPinnedState, this.cardId);
  }

  onSelectTimeChanged(linkedTime: LinkedTime) {
    this.store.dispatch(
      timeSelectionChanged({
        startStep: linkedTime.start.step,
        endStep: linkedTime.end ? linkedTime.end.step : undefined,
      })
    );
  }
}
