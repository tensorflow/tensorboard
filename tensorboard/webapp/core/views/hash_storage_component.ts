/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {fromEvent, Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {DeepLinkerInterface, SetStringOption} from '../../deeplink/types';

export enum ChangedProp {
  ACTIVE_PLUGIN,
}

@Component({
  standalone: false,
  selector: 'hash-storage-component',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HashStorageComponent implements OnInit, OnChanges, OnDestroy {
  constructor(private readonly deepLinker: DeepLinkerInterface) {}

  @Input()
  activePluginId!: string | null;

  @Output()
  onValueChange = new EventEmitter<{prop: ChangedProp; value: string}>();

  private readonly ngUnsubscribe = new Subject<void>();
  private readonly onHashChange: Observable<Event> = fromEvent(
    window,
    'popstate',
    {passive: true}
  ).pipe(takeUntil(this.ngUnsubscribe));

  ngOnInit() {
    // Note: A couple alternative implementations to using 'popstate' event that
    // turn out to be buggy:
    // 1. tf_storage hash listener: It binds to events before zone.js patches
    //    event listeners for change detection ([1]).
    // 2. 'hashchange' event: We observed that window.history.back() and
    //    window.history.forward() do not trigger 'hashchange' events after some
    //    calls to replaceState which AppRouting uses.
    //
    // [1]: https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
    this.onHashChange.subscribe(() => {
      const activePluginId = this.deepLinker.getPluginId();

      if (activePluginId !== this.activePluginId) {
        this.onValueChange.emit({
          prop: ChangedProp.ACTIVE_PLUGIN,
          value: activePluginId,
        });
      }
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activePluginId']) {
      const activePluginIdChange = changes['activePluginId'];

      const option: SetStringOption = {
        defaultValue: '',
        useLocationReplace:
          activePluginIdChange.previousValue === null ||
          activePluginIdChange.firstChange,
      };

      const value =
        activePluginIdChange.currentValue === null
          ? ''
          : activePluginIdChange.currentValue;
      this.deepLinker.setPluginId(value, option);
    }
  }
}
