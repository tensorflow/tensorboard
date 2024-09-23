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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';

@Component({
  standalone: false,
  selector: 'metrics-filtered-view-component',
  template: `
    <div class="group-toolbar">
      <span class="group-text">
        <span class="group-title" aria-role="heading" aria-level="3"
          >Tags matching filter</span
        >
        <span *ngIf="cardIdsWithMetadata.length > 1" class="group-card-count"
          >{{ cardIdsWithMetadata.length | number }} cards</span
        >
      </span>
    </div>
    <metrics-empty-tag-match
      *ngIf="isEmptyMatch"
      class="warn"
    ></metrics-empty-tag-match>
    <metrics-card-grid
      [cardIdsWithMetadata]="cardIdsWithMetadata"
      [cardObserver]="cardObserver"
    ></metrics-card-grid>
  `,
  styleUrls: ['filtered_view_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilteredViewComponent {
  @Input() isEmptyMatch!: boolean;
  @Input() cardObserver!: CardObserver;
  @Input() cardIdsWithMetadata!: CardIdWithMetadata[];
}
