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

@Component({
  selector: 'npmi-annotations-list-toolbar-component',
  templateUrl: './annotations_list_toolbar_component.ng.html',
  styleUrls: ['./annotations_list_toolbar_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListToolbarComponent {
  @Input() numAnnotations!: number;
  @Input() expanded!: boolean;
  @Input() selectedAnnotations!: string[];
  @Input() annotationsExpanded!: boolean;
  @Input() showCounts!: boolean;
  @Input() showHidden!: boolean;
  @Output() onFlagAnnotations = new EventEmitter<string[]>();
  @Output() onHideAnnotations = new EventEmitter<string[]>();
  @Output() onToggleExpanded = new EventEmitter();
  @Output() onToggleShowCounts = new EventEmitter();
  @Output() onToggleShowHidden = new EventEmitter();
}
