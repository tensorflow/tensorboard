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
import {MatIconRegistry} from '@angular/material/icon';
import {FakeMatIconRegistry} from '@angular/material/icon/testing';

// Keep in sync with the 'svg_bundle' target in tensorboard/webapp/BUILD.
const KNOWN_SVG_ICON = new Set([
  'add_24px',
  'arrow_back_24px',
  'arrow_downward_24px',
  'arrow_forward_24px',
  'arrow_upward_24px',
  'brightness_6_24px',
  'bug_report_24px',
  'cancel_24px',
  'chevron_left_24px',
  'chevron_right_24px',
  'clear_24px',
  'close_24px',
  'content_copy_24px',
  'dark_mode_24px',
  'done_24px',
  'drag_indicator_24px',
  'edit_24px',
  'error_24px',
  'expand_less_24px',
  'expand_more_24px',
  'filter_alt_24px',
  'filter_list_24px',
  'flag_24px',
  'fullscreen_24px',
  'fullscreen_exit_24px',
  'get_app_24px',
  'group_work_24px',
  'help_outline_24px',
  'image_search_24px',
  'info_outline_24px',
  'keep_24px',
  'keep_outline_24px',
  'light_mode_24px',
  'line_weight_24px',
  'more_vert_24px',
  'notifications_none_24px',
  'open_in_new_24px',
  'palette_24px',
  'refresh_24px',
  'search_24px',
  'settings_24px',
  'settings_backup_restore_24px',
  'settings_overscan_24px',
  'visibility_off_24px',
  'warning_24px',
]);

/**
 * Requires to be exported for AOT. Do not use it otherwise.
 *
 * Does not extend MatIcon since its implementation detail (such as ngOnChanges)
 * can interfere with the stub implementation. If TensorBoard makes use of a new
 * input on MatIcon that is not present here, it will fail at the test
 * compilation time due to unknown input onto the template.
 */
@Component({
  standalone: false,
  template: '<ng-container>{{svgIcon}}</ng-container>',
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
      // Below will cause test to fail if a component makes use of unknown
      // SVG.
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

  @Input()
  set fontSet(value: string) {
    throw new Error(
      'Usage of fontSet is disallowed in TensorBoard. Use svgIcon.'
    );
  }

  /** Name of an icon within a font set. */
  @Input()
  set fontIcon(icon: string) {
    throw new Error(
      'Usage of fontIcon is disallowed in TensorBoard. Use svgIcon.'
    );
  }
}

@NgModule({
  exports: [MatIcon],
  declarations: [MatIcon],
  providers: [{provide: MatIconRegistry, useClass: FakeMatIconRegistry}],
})
export class MatIconTestingModule {}
