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
  Output,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take, throttleTime, withLatestFrom} from 'rxjs/operators';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {RunColorScale} from '../../../types/ui';
import * as actions from '../../actions';
import {PluginType} from '../../data_source';
import {CardId} from '../../types';

// Since vz-line-chart only updates every 350ms, it does not make sense to
// update the Polymer component more frequently.
// [1]:
// tensorboard/components/vz_line_chart2/vz-line-chart2.js?l=343-360
const RUN_COLOR_UPDATE_THROTTLE_TIME_IN_MS = 350;

@Component({
  standalone: false,
  selector: 'card-view',
  template: `
    <card-view-component
      [isEverVisible]="isEverVisible"
      [cardId]="cardId"
      [groupName]="groupName"
      [pluginType]="pluginType"
      [runColorScale]="runColorScale$ | async"
      (fullWidthChanged)="onFullWidthChanged($event)"
      (fullHeightChanged)="onFullHeightChanged($event)"
      (pinStateChanged)="onPinStateChanged()"
      observeIntersection
      intersectionObserverMargin="200px 200px 200px 200px"
      (onVisibilityChange)="onVisibilityChange($event)"
    >
    </card-view-component>
  `,
  styleUrls: ['card_view_container.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardViewContainer {
  constructor(private readonly store: Store<State>) {
    this.runColorScale$ = this.store.select(selectors.getRunColorMap).pipe(
      throttleTime(RUN_COLOR_UPDATE_THROTTLE_TIME_IN_MS, undefined, {
        leading: true,
        trailing: true,
      }),
      map((colorMap) => {
        return (runId: string) => {
          if (!colorMap.hasOwnProperty(runId)) {
            // Assign white when no colors are assigned to a run by user or
            // by color grouping scheme.
            return '#fff';
          }
          return colorMap[runId];
        };
      })
    );
  }

  isEverVisible = false;

  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Input() pluginType!: PluginType;

  @Output() fullWidthChanged = new EventEmitter<boolean>();
  @Output() fullHeightChanged = new EventEmitter<boolean>();

  onVisibilityChange({visible}: {visible: boolean}) {
    this.isEverVisible = this.isEverVisible || visible;
  }

  readonly runColorScale$: Observable<RunColorScale>;

  onFullWidthChanged(showFullWidth: boolean) {
    this.fullWidthChanged.emit(showFullWidth);
  }

  onFullHeightChanged(showFullHeight: boolean) {
    this.fullHeightChanged.emit(showFullHeight);
  }

  onPinStateChanged() {
    this.store
      .select(selectors.getCardPinnedState, this.cardId)
      .pipe(
        take(1),
        withLatestFrom(this.store.select(selectors.getCanCreateNewPins))
      )
      .subscribe(([wasPinned, canCreateNewPins]) => {
        this.store.dispatch(
          actions.cardPinStateToggled({
            cardId: this.cardId,
            canCreateNewPins,
            wasPinned,
          })
        );
      });
  }
}

export const TEST_ONLY = {
  RUN_COLOR_UPDATE_THROTTLE_TIME_IN_MS,
};
