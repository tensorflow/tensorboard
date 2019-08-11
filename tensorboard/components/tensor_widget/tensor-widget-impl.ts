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
import {formatShapeForDisplay, getDefaultSlicingSpec} from './shape-utils';
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
  protected valueSection: HTMLDivElement;
  protected topRuler: HTMLDivElement;
  protected baseRulerTick: HTMLDivElement;
  protected valueCells: HTMLDivElement[][];

  // Current slicing specification for the underlying tensor.
  protected slicingSpec: TensorViewSlicingSpec;

  constructor(
    private readonly rootElement: HTMLDivElement,
    private readonly tensorView: TensorView,
    options?: TensorWidgetOptions
  ) {
    this.options = options || {};
    this.slicingSpec = getDefaultSlicingSpec(this.tensorView.spec.shape);
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

  /**
   * TODO(cais): Add doc string.
   */
  private async renderValues() {
    console.log(
        `renderValues(): current slicingSpec: ` +
        `${JSON.stringify(this.slicingSpec)}`);  // DEBUG
    if (this.valueSection == null) {
      this.valueSection = document.createElement('div');
      this.rootElement.appendChild(this.valueSection);
    }
    if (this.tensorView.spec.shape.length <= 2) {
      this.createTopRuler();
      console.log(`Rendering 2D tensor: ${this.options.name}`);
      const slicingSpec: TensorViewSlicingSpec = {
        slicingDimsAndIndices: [],
        viewingDims: [0, 1],
        verticalRange: [1, 6],
        horizontalRange: [0, 6]
      };
      const values = await this.tensorView.view(slicingSpec);
      console.log(`values =`, values);
    }
  }

  /**
   * Creates the top ruler.
   *
   * The top ruler includes the topleft-most ruler block, in addition to the
   * column-wise ruler blocks.
   */
  private createTopRuler() {
    if (this.topRuler == null) {
      this.topRuler = document.createElement('div');
      this.topRuler.classList.add('tenesor-widget-top-ruler');
      this.valueSection.appendChild(this.topRuler);
    }

    while (this.topRuler.firstChild) {
      this.topRuler.removeChild(this.topRuler.firstChild);
    }

    this.baseRulerTick = document.createElement('div');
    this.baseRulerTick.classList.add('tensor-vis-top-ruler-tick');
    this.topRuler.appendChild(this.baseRulerTick);

    // TODO(cais): Handle non-2D cases.
    const rank = this.tensorView.spec.shape.length;
    if (rank > 2) {
      throw new Error(`Support for ${rank}D tensor is not implemented yet.`);
    }

    // Whether the number of columns to render on the screen is to be
    // determined, e.g., when the `render` method is called for the first time.
    const determineNumCols = this.slicingSpec.horizontalRange == null;
    if (determineNumCols && rank >= 2) {
      this.slicingSpec.horizontalRange = [0, null];
    }
    const valueSectionRight = this.valueSection.getBoundingClientRect().right;

    let numColsUpperLim: number;
    if (rank <= 1) {
      numColsUpperLim = 1;
    } else {
      const horizontalDim = this.slicingSpec.viewingDims[1];
      numColsUpperLim = this.tensorView.spec.shape[horizontalDim];
    }

    for (let i = 0; i < numColsUpperLim; ++i) {
      const tick = document.createElement('div');
      tick.classList.add('tensor-vis-top-ruler-tick');
      this.topRuler.appendChild(tick);
      if (tick.getBoundingClientRect().right >= valueSectionRight) {
        if (rank >= 2) {
          this.slicingSpec.horizontalRange[1] = i + 1;
        }
        console.log(`Breaking at i = ${i}: horizontalRange:`,
                    this.slicingSpec.horizontalRange);  // DEBUG
        break;
      }
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
