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
  protected rank: number;

  // Constituent UI elements.
  protected headerSection: HTMLDivElement;
  protected infoSubsection: HTMLDivElement;
  protected valueSection: HTMLDivElement;
  protected topRuler: HTMLDivElement;
  protected baseRulerTick: HTMLDivElement;
  protected topRulerTicks: HTMLDivElement[];
  protected leftRulerTicks: HTMLDivElement[];
  protected valueRows: HTMLDivElement[];
  protected valueDivs: HTMLDivElement[][];

  // Current slicing specification for the underlying tensor.
  protected slicingSpec: TensorViewSlicingSpec;

  constructor(
    private readonly rootElement: HTMLDivElement,
    private readonly tensorView: TensorView,
    options?: TensorWidgetOptions
  ) {
    this.options = options || {};
    this.slicingSpec = getDefaultSlicingSpec(this.tensorView.spec.shape);
    this.rank = this.tensorView.spec.shape.length;
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
    if (this.valueSection == null) {
      this.valueSection = document.createElement('div');
      this.rootElement.appendChild(this.valueSection);
    }
    // TOOD(cais): Determine when valueSection should be cleared and drawn from
    // scratch.
    if (this.rank <= 2) {
      this.createTopRuler();
      this.createLeftRuler();
      this.createValueDivs();
      // TODO(cais): The following lines should probably be refactors into a
      // non-creation update-render method.
      this.renderTopRuler();
      this.renderLeftRuler();
      await this.renderValueDivs();
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
      this.topRulerTicks = [];
    }

    while (this.topRuler.firstChild) {
      this.topRuler.removeChild(this.topRuler.firstChild);
    }

    this.baseRulerTick = document.createElement('div');
    this.baseRulerTick.classList.add('tensor-widget-top-ruler-tick');
    this.topRuler.appendChild(this.baseRulerTick);

    // TODO(cais): Handle 3D+ cases.
    if (this.rank > 2) {
      throw new Error(`Support for ${this.rank}D tensor is not implemented yet.`);
    }

    // Whether the number of columns to render on the screen is to be
    // determined, e.g., when the `render` method is called for the first time.
    if (this.rank >= 2) {
      this.slicingSpec.horizontalRange = [0, null];
    }

    let maxNumCols: number;
    if (this.rank <= 1) {
      maxNumCols = 1;
    } else {
      const horizontalDim = this.slicingSpec.viewingDims[1];
      maxNumCols = this.tensorView.spec.shape[horizontalDim];
    }

    const rootElementRight = this.rootElement.getBoundingClientRect().right;
    for (let i = 0; i < maxNumCols; ++i) {
      const tick = document.createElement('div');
      tick.classList.add('tensor-widget-top-ruler-tick');
      this.topRuler.appendChild(tick);
      this.topRulerTicks.push(tick);
      if (tick.getBoundingClientRect().right >= rootElementRight) {
        // The tick has gone out of the right bound of the tensor widget.
        if (this.rank >= 2) {
          this.slicingSpec.horizontalRange[1] = i + 1;
        }
        console.log(`Breaking at i = ${i}: horizontalRange:`,
                    this.slicingSpec.horizontalRange);  // DEBUG
        break;
      }
    }
  }

  private createLeftRuler() {
    if (this.valueRows == null) {
      this.valueRows = [];
      this.leftRulerTicks = [];
    }

    if (this.rank >= 1) {
      this.slicingSpec.verticalRange = [0, null];
    }

    let maxNumRows: number;
    if (this.rank === 0) {
      maxNumRows = 1;
    } else {
      const verticalDim = this.slicingSpec.viewingDims[0];
      maxNumRows = this.tensorView.spec.shape[verticalDim];
    }

    // TODO(cais): Make sure that root element bottom is set to begin with.
    const rootElementBottom = this.rootElement.getBoundingClientRect().bottom;
    for (let i = 0; i < maxNumRows; ++i) {
      const row = document.createElement('div');
      row.classList.add('tensor-widget-value-row');
      this.valueSection.appendChild(row);
      this.valueRows.push(row);

      const tick = document.createElement('div');
      tick.classList.add('tensor-widget-top-ruler-tick');
      row.appendChild(tick);
      this.leftRulerTicks.push(tick);
      if (tick.getBoundingClientRect().bottom >= rootElementBottom) {
        // The tick has gone out of the right bound of the tensor widget.
        if (this.rank >= 1) {
          this.slicingSpec.verticalRange[1] = i + 1;
        }
        console.log(`Breaking at i = ${i}: verticalRange:`,
                    this.slicingSpec.verticalRange);  // DEBUG
        break;
      }
    }
  }

  /**
   * Creates the value divs, according to the presence and counts of the top
   * and left rulers.
   *
   * Value divs are the div elements that hold the currently visible elements
   * of the tensors.
   *
   * This method doesn't render the contents of the value divs, but merely
   * creats them. The `renderValueDivs()` method is what renders their contents
   * (based on the current slicing spec).
   */
  private createValueDivs() {
    this.valueDivs = [];
    const numCols = this.topRulerTicks.length;
    const numRows = this.valueRows.length;
    for (let i = 0; i < numRows; ++i) {
      this.valueDivs[i] = [];
      for (let j = 0; j < numCols; ++j) {
        const valueDiv = document.createElement('div');
        valueDiv.classList.add('tensor-widget-value-div');
        this.valueRows[i].appendChild(valueDiv);
        this.valueDivs[i].push(valueDiv);
      }
    }
  }

  /** TODO(cais): Add doc string. */
  private renderTopRuler() {
    if (this.rank >= 2) {
      for (let i = 0; i < this.topRulerTicks.length; ++i) {
        this.topRulerTicks[i].textContent =
          `${this.slicingSpec.horizontalRange[0] + i}`;
      }
    }
  }

  /** TODO(cais): Add doc string. */
  private renderLeftRuler() {
    if (this.rank >= 1) {
      for (let i = 0; i < this.leftRulerTicks.length; ++i) {
        this.leftRulerTicks[i].textContent =
          `${this.slicingSpec.verticalRange[0] + i}`;
      }
    }
  }

  /**
   * Render contents of the value divs.
   *
   * This method doesn't re-create the value divs, but merely updates
   * the text content of them based on the current slicing spec.
   */
  private async renderValueDivs() {
    const numRows = this.valueDivs.length;
    const numCols = this.valueDivs[0].length;
    if (this.rank === 0) {
      // TODO(cais): Deduplicate the following line?
      const values = await this.tensorView.view(this.slicingSpec) as number;
      // TODO(cais): Implement and call formatValue().
      this.valueDivs[0][0].textContent = `${values.toFixed(2)}`;
    } else if (this.rank === 1) {
      console.log(`rank = 1; slicingSpec.verticalRange = ${this.slicingSpec.verticalRange}`);  // DEBUG
      const values = await this.tensorView.view(this.slicingSpec) as number;
      console.log(`renderValueDivs(): rank=${this.rank}, `,
                  JSON.stringify(values));  // DEBUG
      for (let i = 0; i < numRows; ++i) {
        const valueDiv = this.valueDivs[i][0];
        valueDiv.textContent = `${values[i].toFixed(2)}`;
      }
    } else if (this.rank >= 2) {
      const values = await this.tensorView.view(this.slicingSpec);
      console.log(
        `renderValueDivs(): numRows=${numRows}, numCols=${numCols}`);  // DEBUG
      for (let i = 0; i < numRows; ++i) {
        for (let j = 0; j < numCols; ++j) {
          const valueDiv = this.valueDivs[i][j];
          // TODO(cais): Implement and call formatValue().
          valueDiv.textContent = `${values[i][j].toFixed(2)}`;
        }
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
