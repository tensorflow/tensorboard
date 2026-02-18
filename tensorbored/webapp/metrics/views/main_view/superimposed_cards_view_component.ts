/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {State} from '../../../app_state';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {SuperimposedCardMetadata} from '../../types';
import {superimposedCardFullWidthChanged} from '../../actions';
import {getFullWidthSuperimposedCards} from '../../store';

@Component({
  standalone: false,
  selector: 'superimposed-cards-view-component',
  template: `
    <ng-container *ngIf="superimposedCards.length > 0">
      <div class="group-toolbar">
        <div class="left-items">
          <mat-icon svgIcon="group_work_24px"></mat-icon>
          <span class="group-text">
            <span class="group-title" aria-role="heading" aria-level="3"
              >Superimposed</span
            >
            <span *ngIf="superimposedCards.length > 1" class="group-card-count"
              >{{ superimposedCards.length }} cards</span
            >
          </span>
        </div>
      </div>
      <div class="superimposed-cards-grid">
        <div
          *ngFor="let card of superimposedCards; trackBy: trackByCard"
          class="card-wrapper"
          [class.full-width]="(cardsAtFullWidth$ | async)?.has(card.id)"
          [class.full-height]="cardsAtFullHeight.has(card.id)"
        >
          <superimposed-card
            [superimposedCardId]="card.id"
            (fullWidthChanged)="onFullWidthChanged(card.id, $event)"
            (fullHeightChanged)="onFullHeightChanged(card.id, $event)"
          ></superimposed-card>
        </div>
      </div>
    </ng-container>
  `,
  styleUrls: ['superimposed_cards_view_component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperimposedCardsViewComponent {
  @Input() cardObserver!: CardObserver;
  @Input() superimposedCards: SuperimposedCardMetadata[] = [];

  readonly cardsAtFullWidth$: Observable<Set<string>>;
  cardsAtFullHeight = new Set<string>();

  constructor(private readonly store: Store<State>) {
    this.cardsAtFullWidth$ = this.store.select(getFullWidthSuperimposedCards);
  }

  trackByCard(index: number, card: SuperimposedCardMetadata): string {
    return card.id;
  }

  onFullWidthChanged(cardId: string, fullWidth: boolean) {
    this.store.dispatch(
      superimposedCardFullWidthChanged({
        superimposedCardId: cardId,
        fullWidth,
      })
    );
  }

  onFullHeightChanged(cardId: string, showFullHeight: boolean) {
    if (showFullHeight) {
      this.cardsAtFullHeight.add(cardId);
    } else {
      this.cardsAtFullHeight.delete(cardId);
    }
  }
}
