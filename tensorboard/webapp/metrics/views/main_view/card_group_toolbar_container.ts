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
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  SimpleChanges,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, of, Subject} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {State} from '../../../app_state';
import {metricsTagGroupExpansionChanged} from '../../actions';
import {getMetricsTagGroupExpansionState} from '../../../selectors';

@Component({
  selector: 'metrics-card-group-toolbar',
  template: `
    <metrics-card-group-toolbar-component
      [numberOfCards]="numberOfCards"
      [isGroupExpanded]="isGroupExpanded$ | async"
      [groupName]="groupName"
      (groupExpansionToggled)="onGroupExpansionToggled()"
    ></metrics-card-group-toolbar-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGroupToolBarContainer implements OnChanges {
  @Input() groupName: string | null = null;
  @Input() numberOfCards!: number;

  private readonly groupName$ = new BehaviorSubject<string | null>(null);

  constructor(private readonly store: Store<State>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['groupName']) {
      this.groupName$.next(this.groupName);
    }
  }

  readonly isGroupExpanded$: Observable<boolean> = this.groupName$.pipe(
    switchMap((groupName) => {
      return groupName !== null
        ? this.store.select(getMetricsTagGroupExpansionState, groupName)
        : of(true);
    })
  );

  onGroupExpansionToggled() {
    if (this.groupName === null) {
      throw new RangeError(
        'Invariant error: expansion cannot be toggled when groupName is null'
      );
    }
    this.store.dispatch(
      metricsTagGroupExpansionChanged({tagGroup: this.groupName})
    );
  }
}
