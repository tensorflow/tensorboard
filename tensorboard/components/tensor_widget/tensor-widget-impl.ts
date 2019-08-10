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

import {TensorView, TensorWidget, TensorWidgetOptions, TensorViewSlicingSpec} from './types';
import {formatShapeForDisplay} from './shape-utils';
import {formatTensorName} from './string-utils';

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
   * Render the tensor widget.
   *
   * This method should be called only once after the instantiation of the
   * `TensorWidget` object, unless the value of the underlying tensor,
   * as seen through `tensorView` has changed after the last `render()`
   * call, in which case it can be called again to update the display by
   * the tensor widget.
   */
  async render() {
    this.rootElement.classList.add('tensor-widget');

    this.renderHeader();
    await this.renderValues();
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
   *     elements. See `renderHealthPill()`.
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

    this.renderName();
    this.renderDType();
    this.renderShape();
  }

  /** Render the optional name in the info subsection. */
  private renderName() {
    if (this.options.name == null || this.options.name.length === 0) {
      return;
    }
    const nameDiv = document.createElement('div');
    nameDiv.classList.add('tensor-widget-tensor-name');
    nameDiv.textContent = formatTensorName(this.options.name);
    // Add a hover text that shows the full name.
    nameDiv.title = this.options.name;
    this.infoSubsection.appendChild(nameDiv);
  }

  /** Render the dtype in the info subsection. */
  private renderDType() {
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

  /** Render the shape in the info subsection. */
  private renderShape() {
    const shapeTagDiv = document.createElement('div');
    shapeTagDiv.classList.add('tensor-widget-shape');
    const shapeTagLabel = document.createElement('div');
    shapeTagLabel.classList.add('tensor-widget-shape-label');
    shapeTagLabel.textContent = `shape:`;
    shapeTagDiv.appendChild(shapeTagLabel);
    const shapeTagValue = document.createElement('div');
    shapeTagValue.classList.add('tensor-widget-shape-value');
    shapeTagValue.textContent = formatShapeForDisplay(
      this.tensorView.spec.shape
    );
    shapeTagDiv.appendChild(shapeTagValue);
    this.infoSubsection.appendChild(shapeTagDiv);
  }

  private async renderValues() {
    if (this.tensorView.spec.shape.length === 2) {
      console.log(`Rendering 2D tensor: ${this.options.name}`);
      const slicingSpec: TensorViewSlicingSpec = {
        slicingDimsAndIndices: [],
        viewingDims: [0, 1],
        verticalRange: [1, 6],
        horizontalRange: [0, 6]
      }
      const values = await this.tensorView.view(slicingSpec);
      console.log(`values =`, values);
    }
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
