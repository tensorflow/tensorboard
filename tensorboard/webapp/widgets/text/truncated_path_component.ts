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
import {Component, Input} from '@angular/core';

/**
 * A component for rendering a '/' delimited path. When text exceeds its
 * container's width, it will try to show as much of the last '/' slash piece as
 * possible. If there is no slash piece, it simply truncates from the right with
 * ellipsis.
 */
@Component({
  standalone: false,
  selector: 'tb-truncated-path',
  template: `
    <span *ngIf="firstTextPart().length > 0" class="first-text-part">{{
      firstTextPart()
    }}</span>
    <span class="second-text-part">{{ secondTextPart() }}</span>
  `,
  styleUrls: [`truncated_path_component.css`],
})
export class TruncatedPathComponent {
  // The text to render.
  @Input() value!: string;

  private parseValue() {
    const lastPieceIndex = this.value.lastIndexOf('/');
    if (lastPieceIndex === -1) {
      return {first: '', second: this.value};
    }
    return {
      first: this.value.slice(0, lastPieceIndex),
      second: this.value.slice(lastPieceIndex),
    };
  }

  firstTextPart() {
    return this.parseValue().first;
  }

  secondTextPart() {
    return this.parseValue().second;
  }
}
