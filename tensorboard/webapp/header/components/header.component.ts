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
import {Component, Input, Output, EventEmitter} from '@angular/core';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {MatSelectChange} from '@angular/material/select';

import {PluginId} from '../../types/api';
import {UiPluginMetadata} from '../containers/header.component';

@Component({
  selector: 'app-header-component',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  @Input()
  activePlugins!: UiPluginMetadata[];

  @Input()
  disabledPlugins!: UiPluginMetadata[];

  @Input()
  selectedPlugin!: PluginId;

  @Output()
  onPluginSelectionChanged = new EventEmitter<PluginId>();

  getActivePluginIndex() {
    return this.activePlugins.findIndex(({id}) => id === this.selectedPlugin);
  }

  onActivePluginSelectionChanged({index}: MatTabChangeEvent) {
    this.onPluginSelectionChanged.emit(this.activePlugins[index].id);
  }

  onDisabledPluginSelectionChanged(selectChangeEvent: MatSelectChange) {
    this.onPluginSelectionChanged.emit(selectChangeEvent.value);
  }
}
