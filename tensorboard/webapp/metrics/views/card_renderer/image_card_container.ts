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
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import * as actions from '../../actions';
import {
  ImageStepDatum,
  MetricsDataSource,
  PluginType,
} from '../../data_source/index';
import {
  getCardLoadState,
  getCardMetadata,
  getCardPinnedState,
  getCardStepIndex,
  getCardTimeSeries,
  getMetricsImageBrightnessInMilli,
  getMetricsImageContrastInMilli,
  getMetricsImageShowActualSize,
  getMetricsSelectedTime,
} from '../../store';
import {CardId, CardMetadata} from '../../types';
import {CardRenderer} from '../metrics_view_types';
import {getTagDisplayName} from '../utils';
import {maybeClipSelectedTime, ViewSelectedTime} from './utils';

const DISTANCE_RATIO = 0.1;

type ImageCardMetadata = CardMetadata & {
  plugin: PluginType.IMAGES;
  sample: number;
  numSample: number;
  runId: string;
};

@Component({
  selector: 'image-card',
  template: `
    <image-card-component
      [loadState]="loadState$ | async"
      [title]="title$ | async"
      [tag]="tag$ | async"
      [runId]="runId$ | async"
      [sample]="sample$ | async"
      [numSample]="numSample$ | async"
      [imageUrl]="imageUrl$ | async"
      [stepIndex]="stepIndex$ | async"
      [stepValues]="stepValues$ | async"
      (stepIndexChange)="onStepIndexChanged($event)"
      [brightnessInMilli]="brightnessInMilli$ | async"
      [contrastInMilli]="contrastInMilli$ | async"
      [runColorScale]="runColorScale"
      [showActualSize]="showActualSize"
      [allowToggleActualSize]="(actualSizeGlobalSetting$ | async) === false"
      [isPinned]="isPinned$ | async"
      [selectedTime]="selectedTime$ | async"
      [selectedSteps]="selectedSteps$ | async"
      (onActualSizeToggle)="onActualSizeToggle()"
      (onPinClicked)="pinStateChanged.emit($event)"
    ></image-card-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCardContainer implements CardRenderer, OnInit, OnDestroy {
  constructor(
    private readonly store: Store<State>,
    private readonly dataSource: MetricsDataSource
  ) {}

  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Input() runColorScale!: RunColorScale;
  @Output() fullWidthChanged = new EventEmitter<boolean>();
  @Output() pinStateChanged = new EventEmitter<boolean>();

  onStepIndexChanged($event: number) {
    this.store.dispatch(
      actions.cardStepSliderChanged({
        cardId: this.cardId,
        stepIndex: $event,
      })
    );
  }

  loadState$?: Observable<DataLoadState>;
  title$?: Observable<string>;
  tag$?: Observable<string>;
  runId$?: Observable<string>;
  sample$?: Observable<number>;
  numSample$?: Observable<number>;
  imageUrl$?: Observable<string | null>;
  stepIndex$?: Observable<number | null>;
  stepValues$?: Observable<number[]>;
  isPinned$?: Observable<boolean>;
  selectedTime$?: Observable<ViewSelectedTime | null>;
  selectedSteps$?: Observable<number[]>;
  brightnessInMilli$ = this.store.select(getMetricsImageBrightnessInMilli);
  contrastInMilli$ = this.store.select(getMetricsImageContrastInMilli);
  actualSizeGlobalSetting$ = this.store.select(getMetricsImageShowActualSize);
  showActualSize = false;

  // The UI toggle is overridden by the global setting.
  private actualSizeUiToggled = false;
  private readonly actualSizeUiToggleSubject = new BehaviorSubject(
    this.actualSizeUiToggled
  );
  private readonly ngUnsubscribe = new Subject<void>();

  private isImageCardMetadata(
    cardMetadata: CardMetadata
  ): cardMetadata is ImageCardMetadata {
    const {plugin} = cardMetadata;
    return plugin === PluginType.IMAGES;
  }

  onActualSizeToggle() {
    this.actualSizeUiToggled = !this.actualSizeUiToggled;
    this.actualSizeUiToggleSubject.next(this.actualSizeUiToggled);
  }

  /**
   * Build observables once cardId is defined (after onInit).
   */
  ngOnInit() {
    combineLatest([
      this.actualSizeGlobalSetting$,
      this.actualSizeUiToggleSubject,
    ])
      .pipe(
        takeUntil(this.ngUnsubscribe),
        tap(([settingEnabled, uiToggleEnabled]) => {
          // Actual size mode requires a full width card.
          this.showActualSize = settingEnabled || uiToggleEnabled;
          this.fullWidthChanged.emit(this.showActualSize);
        })
      )
      .subscribe(() => {});

    const selectCardMetadata$ = this.store.select(getCardMetadata, this.cardId);
    const cardMetadata$ = selectCardMetadata$.pipe(
      takeUntil(this.ngUnsubscribe),
      filter((cardMetadata) => {
        return !!cardMetadata && this.isImageCardMetadata(cardMetadata);
      }),
      map((cardMetadata) => {
        return cardMetadata as ImageCardMetadata;
      }),
      shareReplay(1)
    );

    const metadataAndSeries$ = combineLatest([
      cardMetadata$,
      this.store.select(getCardTimeSeries, this.cardId),
    ]);
    const timeSeries$ = metadataAndSeries$.pipe(
      takeUntil(this.ngUnsubscribe),
      map(([cardMetadata, runToSeries]) => {
        const runId = cardMetadata.runId;
        if (!runToSeries || !runToSeries.hasOwnProperty(runId)) {
          return [];
        }
        return runToSeries[runId] as ImageStepDatum[];
      }),
      distinctUntilChanged((series1, series2) => {
        if (series1.length === series2.length && series1.length === 0) {
          return true;
        }
        return series1 === series2;
      }),
      shareReplay(1)
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

    this.sample$ = cardMetadata$.pipe(
      map((cardMetadata) => {
        return cardMetadata.sample;
      })
    );

    this.numSample$ = cardMetadata$.pipe(
      map((cardMetadata) => cardMetadata.numSample)
    );

    this.stepValues$ = timeSeries$.pipe(
      map((series: ImageStepDatum[]) => {
        return series.map((stepDatum) => {
          return stepDatum.step;
        });
      })
    );

    this.isPinned$ = this.store.select(getCardPinnedState, this.cardId);

    this.selectedTime$ = this.store.select(getMetricsSelectedTime).pipe(
      combineLatestWith(this.stepValues$),
      map(([selectedTime, stepValues]) => {
        if (!selectedTime) return null;

        let minStep = Infinity;
        let maxStep = -Infinity;
        for (const step of stepValues) {
          minStep = Math.min(step, minStep);
          maxStep = Math.max(step, maxStep);
        }
        return maybeClipSelectedTime(selectedTime, minStep, maxStep);
      })
    );

    this.selectedSteps$ = this.selectedTime$.pipe(
      combineLatestWith(this.stepValues$),
      map(([selectedTime, stepValues]) => {
        if (!selectedTime) return [];

        if (selectedTime.endStep === null) {
          if (stepValues.indexOf(selectedTime.startStep) !== -1)
            return [selectedTime.startStep];
          return [];
        }

        const selectedStepsInRange = [];
        for (const step of stepValues) {
          if (step >= selectedTime.startStep && step <= selectedTime.endStep) {
            selectedStepsInRange.push(step);
          }
        }
        return selectedStepsInRange;
      })
    );

    this.stepIndex$ = combineLatest(
      this.store.select(getCardStepIndex, this.cardId),
      this.selectedTime$,
      this.selectedSteps$,
      this.stepValues$
    ).pipe(
      map(([stepIndex, selectedTime, selectedSteps, stepValues]) => {
        if (!selectedTime || selectedTime.clipped) return stepIndex;

        // When there is no selected steps. We check if start step is
        // "close" enough to a step value and move it.
        if (selectedSteps.length === 0) {
          if (stepValues.length === 1) return stepIndex;

          const selectedTimeStepValue = selectedTime.startStep;
          for (let i = 0; i < stepValues.length - 2; i++) {
            const currentStepValue = stepValues[i];
            const nextStepValue = stepValues[i + 1];
            const distance =
              (nextStepValue - currentStepValue) * DISTANCE_RATIO;
            if (selectedTimeStepValue < currentStepValue) return stepIndex;

            if (selectedTimeStepValue - currentStepValue <= distance) {
              return i;
            }
            if (nextStepValue - selectedTimeStepValue <= distance) {
              return i + 1;
            }
          }
        }

        const firstSelectedStep = selectedSteps[0];
        const lastSelectedStep = selectedSteps[selectedSteps.length - 1];

        // Range selection
        if (selectedTime.endStep !== null && stepIndex !== null) {
          const step = stepValues[stepIndex];

          // Does not move index when it is already in selected range.
          if (selectedTime.startStep <= step && step <= selectedTime.endStep) {
            return stepIndex;
          }

          // Moves thumb to the closest stepIndex.
          if (step >= lastSelectedStep) {
            return stepValues.indexOf(lastSelectedStep);
          }
          if (step <= firstSelectedStep) {
            return stepValues.indexOf(firstSelectedStep);
          }
        }

        // Single selection
        const nextStepIndex = stepValues.indexOf(firstSelectedStep);
        if (nextStepIndex !== -1) return nextStepIndex;

        return stepIndex;
      })
    );

    const timeSeriesAndStepIndex$ = combineLatest([
      timeSeries$,
      this.stepIndex$,
    ]);
    const stepDatum$ = timeSeriesAndStepIndex$.pipe(
      map(([timeSeries, stepIndex]) => {
        if (stepIndex === null || !timeSeries[stepIndex]) {
          return null;
        }
        return timeSeries[stepIndex];
      })
    );

    this.imageUrl$ = stepDatum$.pipe(
      map((stepDatum: ImageStepDatum | null) => {
        if (!stepDatum) {
          return null;
        }
        return this.dataSource.imageUrl(stepDatum.imageId);
      })
    );
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
