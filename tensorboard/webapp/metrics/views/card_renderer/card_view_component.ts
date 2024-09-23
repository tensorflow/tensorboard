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
import {RunColorScale} from '../../../types/ui';
import {PluginType} from '../../data_source';
import {CardId} from '../../types';

@Component({
  standalone: false,
  selector: 'card-view-component',
  templateUrl: 'card_view_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardViewComponent {
  readonly PluginType = PluginType;

  @Input() isEverVisible!: boolean;
  @Input() cardId!: CardId;
  @Input() groupName!: string | null;
  @Input() pluginType!: PluginType;
  @Input() runColorScale!: RunColorScale;

  @Output() fullWidthChanged = new EventEmitter<boolean>();
  @Output() fullHeightChanged = new EventEmitter<boolean>();
  @Output() pinStateChanged = new EventEmitter<void>();

  onFullWidthChanged(showFullWidth: boolean) {
    this.fullWidthChanged.emit(showFullWidth);
  }

  onFullHeightChanged(showFullHeight: boolean) {
    this.fullHeightChanged.emit(showFullHeight);
  }

  onPinStateChanged() {
    this.pinStateChanged.emit();
  }
}
