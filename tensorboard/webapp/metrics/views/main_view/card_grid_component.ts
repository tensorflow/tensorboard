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
import {CdkScrollable} from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Optional,
  Output,
} from '@angular/core';

import {PluginType} from '../../data_source';
import {CardObserver} from '../card_renderer/card_lazy_loader';

import {CardIdWithMetadata} from '../metrics_view_types';

@Component({
  selector: 'metrics-card-grid-component',
  templateUrl: './card_grid_component.ng.html',
  styleUrls: ['./card_grid_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGridComponent {
  readonly PluginType = PluginType;

  @Input() isGroupExpandable!: boolean;
  @Input() isGroupExpanded!: boolean;
  @Input() groupName!: string | null;
  @Input() pageIndex!: number;
  @Input() numPages!: number;
  @Input() cardIdsWithMetadata!: CardIdWithMetadata[];
  @Input() cardObserver!: CardObserver;
  @Input() showPaginationControls!: boolean;

  @Output() pageIndexChanged = new EventEmitter<number>();
  @Output() groupExpansionToggled = new EventEmitter<void>();

  constructor(
    @Optional() private readonly cdkScrollable: CdkScrollable | null
  ) {}

  showExpand(isBottomControl: boolean): boolean {
    return isBottomControl ? this.isGroupExpandable : false;
  }

  showPaginationInput(isBottomControl: boolean) {
    return isBottomControl;
  }

  handlePageChange(pageIndex: number, target: HTMLElement) {
    // Clear call stack to allow dom update before updating scroll to keep
    // relative position.
    const topBeforeChange = target.getBoundingClientRect().top;
    setTimeout(() => {
      this.scrollToKeepTargetPosition(target, topBeforeChange);
    }, 0);

    this.pageIndexChanged.emit(pageIndex);
  }

  scrollToKeepTargetPosition(target: HTMLElement, previousTop: number) {
    const scrollingElement = this.cdkScrollable?.getElementRef().nativeElement;
    if (scrollingElement) {
      scrollingElement.scrollTo(
        0,
        target.getBoundingClientRect().top -
          previousTop +
          scrollingElement.scrollTop
      );
    }
  }

  trackByCards(index: number, cardIdWithMetadata: CardIdWithMetadata) {
    return cardIdWithMetadata.cardId;
  }

  onPaginationInputChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (event.type === 'input' && input.value === '') {
      return;
    }

    const currentValue = Number(input.value) - 1;
    const nextValue = Math.min(Math.max(0, currentValue), this.numPages - 1);

    // Rectifying logic is at the container but the rectified value does not
    // appropriately make changes to the `<input>`.
    // Speculation: Angular seems to have some check on the template level that
    // does shallow equals and prevent changing on the same value.
    // Evidence: pageIndex change does fire, but `ngOnChanges` does not get
    // triggered when the value is the same (rectified value).
    if (input.value !== String(nextValue + 1)) {
      input.value = String(nextValue + 1);
    }

    this.handlePageChange(nextValue, input);
  }
}
