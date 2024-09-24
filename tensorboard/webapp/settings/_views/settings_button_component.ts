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
import {Component, Input} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {DataLoadState} from '../../types/data';
import {SettingsDialogContainer} from './settings_dialog_container';

@Component({
  standalone: false,
  selector: 'settings-button-component',
  template: `
    <button
      mat-icon-button
      [disabled]="isButtonDisabled()"
      (click)="openDialog()"
    >
      <mat-icon svgIcon="settings_24px"></mat-icon>
    </button>
  `,
})
export class SettingsButtonComponent {
  @Input() settingsLoadState!: DataLoadState;

  constructor(private dialog: MatDialog) {}

  isButtonDisabled() {
    // Button is disabled if we have not yet attempted to start
    // loading the settings or if we are still loading settings.
    // It means button is enabled when we have either successfully or
    // unsucessfully completed the attempt to load settings.
    return (
      this.settingsLoadState === DataLoadState.NOT_LOADED ||
      this.settingsLoadState === DataLoadState.LOADING
    );
  }

  openDialog(): void {
    this.dialog.open(SettingsDialogContainer, {
      width: '400px',
    });
  }
}
