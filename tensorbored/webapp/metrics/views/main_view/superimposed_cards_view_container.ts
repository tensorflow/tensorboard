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
import {startWith} from 'rxjs/operators';
import {State} from '../../../app_state';
import {getMetricsCardMinWidth} from '../../../selectors';
import {getSuperimposedCardsWithMetadata} from '../../store';
import {SuperimposedCardMetadata} from '../../types';
import {CardObserver} from '../card_renderer/card_lazy_loader';

@Component({
  standalone: false,
  selector: 'metrics-superimposed-cards-view',
  template: `
    <superimposed-cards-view-component
      [superimposedCards]="superimposedCards$ | async"
      [cardObserver]="cardObserver"
      [cardMinWidth]="cardMinWidth$ | async"
    ></superimposed-cards-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperimposedCardsViewContainer {
  @Input() cardObserver!: CardObserver;

  readonly superimposedCards$: Observable<SuperimposedCardMetadata[]>;
  readonly cardMinWidth$: Observable<number | null>;

  constructor(private readonly store: Store<State>) {
    this.superimposedCards$ = this.store
      .select(getSuperimposedCardsWithMetadata)
      .pipe(startWith([]));
    this.cardMinWidth$ = this.store.select(getMetricsCardMinWidth);
  }
}
