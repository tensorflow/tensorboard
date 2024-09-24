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
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';

@Component({
  standalone: false,
  selector: 'metrics-pinned-view-component',
  template: `
    <div class="group-toolbar">
      <div class="left-items">
        <mat-icon svgIcon="keep_24px"></mat-icon>
        <span class="group-text">
          <span class="group-title" aria-role="heading" aria-level="3"
            >Pinned</span
          >
          <span *ngIf="cardIdsWithMetadata.length > 1" class="group-card-count"
            >{{ cardIdsWithMetadata.length }} cards</span
          >
          <span *ngIf="lastPinnedCardTime">
            <span
              *ngFor="let id of [lastPinnedCardTime]"
              [attr.data-id]="id"
              class="new-card-pinned"
              >New card pinned</span
            >
          </span>
        </span>
      </div>
      <div
        class="right-items"
        *ngIf="cardIdsWithMetadata.length > 0 && globalPinsEnabled"
      >
        <button
          mat-stroked-button
          aria-label="Clear all pinned cards"
          (click)="onClearAllPinsClicked.emit()"
        >
          Clear all pins
        </button>
      </div>
    </div>
    <metrics-card-grid
      *ngIf="cardIdsWithMetadata.length; else emptyPinnedView"
      [cardIdsWithMetadata]="cardIdsWithMetadata"
      [cardObserver]="cardObserver"
    ></metrics-card-grid>
    <ng-template #emptyPinnedView>
      <div class="empty-message">Pin cards for a quick view and comparison</div>
    </ng-template>
  `,
  styleUrls: ['pinned_view_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinnedViewComponent {
  @Input() cardObserver!: CardObserver;
  @Input() cardIdsWithMetadata!: CardIdWithMetadata[];
  @Input() lastPinnedCardTime!: number;
  @Input() globalPinsEnabled: boolean = false;
  @Output() onClearAllPinsClicked = new EventEmitter<void>();
}
