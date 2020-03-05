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
import {Component, Input, NgModule} from '@angular/core';

const KNOWN_SVG_ICON = new Set([
  'settings_24px',
  'help_outline_24px',
  'refresh_24px',
]);

/**
 * Requires to be exported for AOT. Do not use it otherwise.
 */
@Component({
  template: '<ng-container>{{ svgIcon }}</ng-container>',
  selector: 'mat-icon',
})
export class MatIcon {
  private internalSvgIcon: string = '';

  @Input()
  set svgIcon(svgIcon: string) {
    if (!KNOWN_SVG_ICON.has(svgIcon)) {
      const humanReadableIconNames = Array.from(KNOWN_SVG_ICON.values()).join(
        ', '
      );
      // Below will cause test to fail if a component makes use of unknown SVG.
      throw new RangeError(
        [
          `Unknown SVG mat-icon, "${svgIcon}".`,
          `Must be one of [${humanReadableIconNames}].`,
        ].join(' ')
      );
    }
    this.internalSvgIcon = svgIcon;
  }

  get svgIcon() {
    return this.internalSvgIcon;
  }
}

@NgModule({
  exports: [MatIcon],
  declarations: [MatIcon],
})
export class MatIconTestingModule {}
