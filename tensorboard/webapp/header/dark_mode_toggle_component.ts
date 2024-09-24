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
import {Component, EventEmitter, Input, Output} from '@angular/core';

export enum DarkModeOverride {
  DEFAULT,
  DARK_MODE_ON,
  DARK_MODE_OFF,
}

@Component({
  standalone: false,
  selector: 'app-header-dark-mode-toggle-component',
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      aria-label="Menu for changing light or dark theme"
      [ngSwitch]="darkModeOverride"
      [title]="getButtonTitle()"
    >
      <mat-icon
        *ngSwitchCase="DarkModeOverride.DEFAULT"
        svgIcon="brightness_6_24px"
      ></mat-icon>
      <mat-icon
        *ngSwitchCase="DarkModeOverride.DARK_MODE_OFF"
        svgIcon="light_mode_24px"
      ></mat-icon>
      <mat-icon
        *ngSwitchCase="DarkModeOverride.DARK_MODE_ON"
        svgIcon="dark_mode_24px"
      ></mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      <button
        mat-menu-item
        title="Set the theme to match the default mode in the browser."
        (click)="onOverrideChanged.emit(DarkModeOverride.DEFAULT)"
      >
        <label>Browser default</label>
      </button>
      <button
        mat-menu-item
        title="Force light TensorBoard theme."
        (click)="onOverrideChanged.emit(DarkModeOverride.DARK_MODE_OFF)"
      >
        <label>Light</label>
      </button>
      <button
        mat-menu-item
        title="Force dark TensorBoard theme."
        (click)="onOverrideChanged.emit(DarkModeOverride.DARK_MODE_ON)"
      >
        <label>Dark</label>
      </button>
    </mat-menu>
  `,
})
export class DarkModeToggleComponent {
  readonly DarkModeOverride = DarkModeOverride;

  @Input()
  darkModeOverride!: DarkModeOverride;

  @Output()
  onOverrideChanged = new EventEmitter<DarkModeOverride>();

  getButtonTitle(): string {
    let mode: string;

    switch (this.darkModeOverride) {
      case DarkModeOverride.DEFAULT:
        mode = 'Browser default';
        break;
      case DarkModeOverride.DARK_MODE_ON:
        mode = 'Dark mode';
        break;
      case DarkModeOverride.DARK_MODE_OFF:
        mode = 'Light mode';
        break;
    }
    return `Current mode: [${mode}]. Switch between browser default, light, or dark theme.`;
  }
}
