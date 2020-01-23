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
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';

export enum ChangedProp {
  ACTIVE_PLUGIN,
}

// TODO(tensorboard-team): remove below when storage.ts is pure TypeScript
// module.
const TAB = '__tab__';

interface TfGlobalsElement extends HTMLElement {
  tf_globals: {
    setUseHash(use: boolean): void;
  };
}

interface SetStringOption {
  defaultValue?: string;
  useLocationReplace?: boolean;
}

interface TfStorageElement extends HTMLElement {
  tf_storage: {
    setString(key: string, value: string, options: SetStringOption): void;
    getString(key: string): string;
  };
}

@Component({
  selector: 'hash-storage-component',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HashStorageComponent implements OnInit, OnChanges, OnDestroy {
  private readonly tfGlobals = (document.createElement(
    'tf-globals'
  ) as TfGlobalsElement).tf_globals;
  private readonly tfStorage = (document.createElement(
    'tf-storage'
  ) as TfStorageElement).tf_storage;
  private readonly onHashChange = this.onHashChangedImpl.bind(this);

  @Input()
  activePluginId!: string;

  @Output()
  onValueChange = new EventEmitter<{prop: ChangedProp; value: string}>();

  private onHashChangedImpl() {
    const activePluginId = this.tfStorage.getString(TAB);

    if (activePluginId !== this.activePluginId) {
      this.onValueChange.emit({
        prop: ChangedProp.ACTIVE_PLUGIN,
        value: activePluginId,
      });
    }
  }

  ngOnInit() {
    // As opposed to fake hash that does not modify the URL.
    this.tfGlobals.setUseHash(true);

    // Cannot use the tf_storage hash listener because it binds to event before the
    // zone.js patch. According to [1], zone.js patches various asynchronos calls and
    // event listeners to detect "changes" and mark components as dirty for re-render.
    // When using tf_storage hash listener, it causes bad renders in Angular due to
    // missing dirtiness detection.
    // [1]: https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
    window.addEventListener('hashchange', this.onHashChange);
  }

  ngOnDestroy() {
    window.removeEventListener('hashchange', this.onHashChange);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activePluginId']) {
      const activePluginIdChange = changes['activePluginId'];
      const option: SetStringOption = {};
      if (activePluginIdChange.firstChange) {
        option.useLocationReplace = true;
      }
      this.tfStorage.setString(TAB, activePluginIdChange.currentValue, option);
    }
  }
}
