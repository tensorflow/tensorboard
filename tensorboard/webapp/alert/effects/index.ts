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
import {Injectable, inject} from '@angular/core';
import {Actions, createEffect} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {tap} from 'rxjs/operators';
import {State} from '../../app_state';
import {alertReported} from '../actions';
import {AlertActionModule} from '../alert_action_module';

@Injectable()
export class AlertEffects {
  private readonly actions$ = inject(Actions);
  private readonly store: Store<State> = inject(Store);
  private readonly alertActionModule = inject(AlertActionModule);

  /** @export */
  reportRegisteredActionAlerts$ = createEffect(
    () => {
      return this.actions$.pipe(
        tap((action) => {
          const alertInfo = this.alertActionModule.getAlertFromAction(action);
          if (alertInfo) {
            this.store.dispatch(alertReported(alertInfo));
          }
        })
      );
    },
    {dispatch: false}
  );
}
