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

import {isFloatDType} from './dtype-helper';
import {drawHealthPill} from './health-pill';
import {getDefaultSlicingSpec} from './shape-helper';
import {TensorWidget, TensorWidgetOptions, TensorView, TensorViewSlicingSpec} from './types';

const DEFAULT_DECIMAL_PLACES = 2;

// TODO(cais): Add tensorNameLengthCutoff to TensorWidgetOptions.
const DEFAULT_TENSOR_NAME_LENGTH_CUTOFF = 20;

/** An implementation of TensorWidget. */
export class TensorWidgetImpl implements TensorWidget {
  protected options: TensorWidgetOptions;
  protected readonly slicingSpec: TensorViewSlicingSpec;
  // How many decimal places to show for each element.
  protected decimalPlaces: number;

  // UI elements.
  protected header: HTMLDivElement;
  protected infoControl: HTMLDivElement;
  protected healthPillDiv: HTMLDivElement;

  constructor(
      private readonly rootElement: HTMLDivElement,
      private readonly tensorView: TensorView,
      options?: TensorWidgetOptions) {
    this.options = options || {};

    this.slicingSpec = getDefaultSlicingSpec(this.tensorView.spec.shape);

    if (isFloatDType(this.tensorView.spec.dtype)) {
      this.decimalPlaces =
          this.options.decimalPlaces == null ?
          DEFAULT_DECIMAL_PLACES : this.options.decimalPlaces;
    }
  }

  async render(): Promise<void> {
    this.rootElement.classList.add('tensor-widget');
    this.createHeader();
  }

  async scrollVertically(index: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async scrollHorizontally(index: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async navigateToIndices(indices: number[]): Promise<void> {
    throw new Error('Not implemented');
  }

  private async createHeader() {
    if (this.header == null) {
      this.header = document.createElement('div');
      this.header.classList.add('tensor-widget-header');
      this.rootElement.appendChild(this.header);
    }
    this.createInfoControl();

    // Create div for health pill.
    this.healthPillDiv = document.createElement('div') as HTMLDivElement;
    this.healthPillDiv.classList.add('tensor-widget-health-pill');
    this.header.appendChild(this.healthPillDiv);
    drawHealthPill(
        this.healthPillDiv, this.tensorView.spec,
        await this.tensorView.getHealthPill());

    // TODO(cais): Create menu.
  }

  private createInfoControl() {
    if (this.infoControl == null) {
      this.infoControl = document.createElement('div');
      this.infoControl.classList.add('tensor-widget-info-control');
      this.header.appendChild(this.infoControl);
    }

    // Clear the info control.
    while (this.infoControl.firstChild) {
      this.infoControl.removeChild(this.infoControl.firstChild);
    }

    // Create name control.
    if (this.options.name != null && this.options.name.length > 0) {
      const nameTagDiv = document.createElement('div');
      nameTagDiv.classList.add('tensor-widget-tensor-name');
      const nameLength = this.options.name.length;
      nameTagDiv.textContent =
          nameLength > DEFAULT_TENSOR_NAME_LENGTH_CUTOFF ?
          `...${this.options.name.slice(
              nameLength - DEFAULT_TENSOR_NAME_LENGTH_CUTOFF, nameLength)}` :
          this.options.name;

      this.infoControl.appendChild(nameTagDiv);
    }

    this.createDTypeTag();
    this.createShapeTag();
  }

  /** Create the dtype tag in the info control. */
  private createDTypeTag() {

    const dTypeControl = document.createElement('div');
    dTypeControl.classList.add('tensor-widget-dtype-tag');

    const dTypeLabel = document.createElement('span');
    dTypeLabel.classList.add('tensor-widget-dtype-tag-label');
    dTypeLabel.textContent = 'dtype:';
    dTypeControl.appendChild(dTypeLabel);

    const dTypeValue = document.createElement('span');
    dTypeValue.textContent = this.tensorView.spec.dtype;
    dTypeControl.appendChild(dTypeValue);

    this.infoControl.appendChild(dTypeControl);
  }

  /** Create the shape tag in the info control. */
  private createShapeTag() {
    const shapeTagDiv = document.createElement('div');
    shapeTagDiv.classList.add('tensor-widget-shape-tag');
    const shapeTagLabel = document.createElement('div');
    shapeTagLabel.classList.add('tensor-widget-shape-tag-label');
    shapeTagLabel.textContent = `shape:`;
    shapeTagDiv.appendChild(shapeTagLabel);
    const shapeTagValue = document.createElement('div');
    shapeTagValue.classList.add('tensor-widget-shape-tag-value');
    shapeTagValue.textContent = `[${this.tensorView.spec.shape}]`;
    shapeTagDiv.appendChild(shapeTagValue);
    this.infoControl.appendChild(shapeTagDiv);
  }
}
