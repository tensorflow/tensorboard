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

import {TensorView, TensorWidget, TensorWidgetOptions} from './types';

const DEFAULT_TENSOR_NAME_LENGTH_CUTOFF = 20;

/**
 * Implementation of TensorWidget.
 */

/** An implementation of TensorWidget single-tensor view. */
export class TensorWidgetImpl implements TensorWidget {
  private options: TensorWidgetOptions;

  // Constituent UI elements.
  protected headerSection: HTMLDivElement;
  protected infoSubsection: HTMLDivElement;

  constructor(
    private readonly rootElement: HTMLDivElement,
    private readonly tensorView: TensorView,
    options?: TensorWidgetOptions
  ) {
    this.options = options || {};
  }

  /**
   * TODO(cais): Doc string.
   *
   * This method should be called only once after the instantiation of the
   * `TensorWidget` object, unless the value of the underlying tensor,
   * as seen through `tensorView` has changed after the last `render()`
   * call.
   */
  async render() {
    this.rootElement.classList.add('tensor-widget');

    this.renderHeader();
    // TODO(cais): Implement and call renderValues();
  }

  /**
   * Render the header section of the TensorWidget.
   *
   * A TensorWidget has two sections, namely the header and the value sections.
   * This method is responsible for rendering the former. The latter is rendered
   * by `renderValues()`.
   *
   * The header section itself consists of the following regions:
   *   - The info subsection, which displays basic information about the tensor,
   *     including name, dtype and shape. See `renderInfo()`.
   *   - The health-pill subsection, which displays numeric summary of the tensor's
   *     eleements. See `renderHealthPill()`.
   *   - The menu. See `createMenu()`.
   */
  private renderHeader() {
    if (this.headerSection == null) {
      this.headerSection = document.createElement('div');
      this.headerSection.classList.add('tensor-widget-header');
      this.rootElement.appendChild(this.headerSection);
    }
    this.renderInfo();

    // TODO(cais): Implement and call renderHealthPill().
    // TODO(cais): Implement and call createMenu();
  }

  /**
   * Render the info subsection of the header section.
   */
  private renderInfo() {
    if (this.infoSubsection == null) {
      this.infoSubsection = document.createElement('div');
      this.infoSubsection.classList.add('tensor-widget-info');
      this.headerSection.appendChild(this.infoSubsection);
    }

    // Clear the info control.
    while (this.infoSubsection.firstChild) {
      this.infoSubsection.removeChild(this.infoSubsection.firstChild);
    }

    // Create name control.
    if (this.options.name != null && this.options.name.length > 0) {
      const nameTagDiv = document.createElement('div');
      nameTagDiv.classList.add('tensor-widget-tensor-name');
      const nameLength = this.options.name.length;
      nameTagDiv.textContent =
        nameLength > DEFAULT_TENSOR_NAME_LENGTH_CUTOFF
          ? `...${this.options.name.slice(
              nameLength - DEFAULT_TENSOR_NAME_LENGTH_CUTOFF,
              nameLength
            )}`
          : this.options.name;

      this.infoSubsection.appendChild(nameTagDiv);
    }

    this.createDTypeTag();
    this.createShapeTag();
  }

  /** Create the dtype tag in the info subsection. */
  private createDTypeTag() {
    const dTypeControl = document.createElement('div');
    dTypeControl.classList.add('tensor-widget-dtype');

    const dTypeLabel = document.createElement('span');
    dTypeLabel.classList.add('tensor-widget-dtype-label');
    dTypeLabel.textContent = 'dtype:';
    dTypeControl.appendChild(dTypeLabel);

    const dTypeValue = document.createElement('span');
    dTypeValue.textContent = this.tensorView.spec.dtype;
    dTypeControl.appendChild(dTypeValue);

    this.infoSubsection.appendChild(dTypeControl);
  }

  /** Create the shape tag in the info subsection. */
  private createShapeTag() {
    const shapeTagDiv = document.createElement('div');
    shapeTagDiv.classList.add('tensor-widget-shape');
    const shapeTagLabel = document.createElement('div');
    shapeTagLabel.classList.add('tensor-widget-shape-label');
    shapeTagLabel.textContent = `shape:`;
    shapeTagDiv.appendChild(shapeTagLabel);
    const shapeTagValue = document.createElement('div');
    shapeTagValue.classList.add('tensor-widget-shape-value');
    shapeTagValue.textContent = `[${this.tensorView.spec.shape}]`;
    shapeTagDiv.appendChild(shapeTagValue);
    this.infoSubsection.appendChild(shapeTagDiv);
  }

  async scrollHorizontally(index: number) {
    throw new Error('scrollHorizontally() is not implemented yet.');
  }

  async scrollVertically(index: number) {
    throw new Error('scrollVertically() is not implemented yet.');
  }

  async navigateToIndices(indices: number[]) {
    throw new Error('navigateToIndices() is not implemented yet.');
  }
}
