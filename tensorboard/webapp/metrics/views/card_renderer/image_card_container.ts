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
  getCardStepIndexMetaData,
  getCardTimeSeries,
  getMetricsImageBrightnessInMilli,
  getMetricsImageCardSteps,
  getMetricsImageContrastInMilli,
  getMetricsImageShowActualSize,
  getMetricsLinkedTimeSelection,
} from '../../store';
import {CardId, CardMetadata} from '../../types';
import {CardRenderer} from '../metrics_view_types';
import {getTagDisplayName} from '../utils';
import {maybeClipTimeSelectionView, TimeSelectionView} from './utils';

const DISTANCE_RATIO = 0.1;

type ImageCardMetadata = CardMetadata & {
  plugin: PluginType.IMAGES;
  sample: number;
  numSample: number;
  runId: string;
};

@Component({
  standalone: false,
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
      [steps]="steps$ | async"
      [isClosestStepHighlighted]="isClosestStepHighlighted$ | async"
      (stepIndexChange)="onStepIndexChanged($event)"
      [brightnessInMilli]="brightnessInMilli$ | async"
      [contrastInMilli]="contrastInMilli$ | async"
      [runColorScale]="runColorScale"
      [showActualSize]="showActualSize"
      [allowToggleActualSize]="(actualSizeGlobalSetting$ | async) === false"
      [isPinned]="isPinned$ | async"
      [linkedTimeSelection]="linkedTimeSelection$ | async"
      [selectedSteps]="selectedSteps$ | async"
      (onActualSizeToggle)="onActualSizeToggle()"
      (onPinClicked)="pinStateChanged.emit($event)"
    ></image-card-component>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCardContainer implements CardRenderer, OnInit, OnDestroy {
  constructor(
    private readonly store: Store<State>,
    private readonly dataSource: MetricsDataSource
  ) {
    this.brightnessInMilli$ = this.store.select(
      getMetricsImageBrightnessInMilli
    );
    this.contrastInMilli$ = this.store.select(getMetricsImageContrastInMilli);
    this.actualSizeGlobalSetting$ = this.store.select(
      getMetricsImageShowActualSize
    );
  }

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
  isClosestStepHighlighted$?: Observable<boolean | null>;
  steps$?: Observable<number[]>;
  isPinned$?: Observable<boolean>;
  linkedTimeSelection$?: Observable<TimeSelectionView | null>;
  selectedSteps$?: Observable<number[]>;
  brightnessInMilli$;
  contrastInMilli$;
  actualSizeGlobalSetting$;
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

    this.stepIndex$ = this.store
      .select(getCardStepIndexMetaData, this.cardId)
      .pipe(
        map((stepIndexMetaData) =>
          stepIndexMetaData ? stepIndexMetaData.index : null
        )
      );
    this.isClosestStepHighlighted$ = this.store
      .select(getCardStepIndexMetaData, this.cardId)
      .pipe(
        map((stepIndexMetaData) =>
          stepIndexMetaData ? stepIndexMetaData.isClosest : false
        )
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

    this.steps$ = this.store.select(getMetricsImageCardSteps, this.cardId);

    this.isPinned$ = this.store.select(getCardPinnedState, this.cardId);

    this.linkedTimeSelection$ = this.store
      .select(getMetricsLinkedTimeSelection)
      .pipe(
        combineLatestWith(this.steps$),
        map(([linkedTimeSelection, steps]) => {
          if (!linkedTimeSelection) return null;

          const minStep = Math.min(...steps);
          const maxStep = Math.max(...steps);
          return maybeClipTimeSelectionView(
            linkedTimeSelection,
            minStep,
            maxStep
          );
        })
      );

    // TODO(japie1235813): Reuses `getSelectedSteps` in store_utils.
    this.selectedSteps$ = this.linkedTimeSelection$.pipe(
      combineLatestWith(this.steps$),
      map(([linkedTimeSelection, steps]) => {
        if (!linkedTimeSelection) return [];

        if (linkedTimeSelection.endStep === null) {
          if (steps.indexOf(linkedTimeSelection.startStep) !== -1)
            return [linkedTimeSelection.startStep];
          return [];
        }

        return steps.filter(
          (step) =>
            step >= linkedTimeSelection.startStep &&
            step <= linkedTimeSelection.endStep!
        );
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
