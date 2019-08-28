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

import {isIntegerDType, isFloatDType} from './dtype-utils';
import {
  formatShapeForDisplay,
  getDefaultSlicingSpec,
  areSlicingSpecsCompatible,
} from './shape-utils';
import {SlicingControl} from './slicing-control';
import {formatTensorName, numericValueToString} from './string-utils';
import {
  TensorView,
  TensorWidget,
  TensorWidgetOptions,
  TensorViewSlicingSpec,
} from './types';

/**
 * Implementation of TensorWidget.
 */

/** An implementation of TensorWidget single-tensor view. */
export class TensorWidgetImpl implements TensorWidget {
  private options: TensorWidgetOptions;
  protected rank: number;

  // Constituent UI elements.
  protected headerSection: HTMLDivElement | null = null;
  protected infoSubsection: HTMLDivElement | null = null;
  protected slicingSpecRoot: HTMLDivElement | null = null;
  protected valueSection: HTMLDivElement | null = null;
  protected topRuler: HTMLDivElement | null = null;
  protected baseRulerTick: HTMLDivElement | null = null;
  protected topRulerTicks: HTMLDivElement[] = [];
  protected leftRulerTicks: HTMLDivElement[] = [];
  protected valueRows: HTMLDivElement[] = [];
  protected valueDivs: HTMLDivElement[][] = [];

  // The UI slicing control used by 3D+ tensors.
  protected slicingControl: SlicingControl | null = null;

  // Whether the height of the root element is insufficient to display
  // all the rows (vertical dimension under currrent slicing) at once.
  protected rowsCutoff: boolean = false;
  // Whether the height of the root element is insufficient to display
  // all the columns rows (horizontal dimension under currrent slicing) at once.
  protected colsCutoff: boolean = false;

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
    if (
      !isIntegerDType(this.tensorView.spec.dtype) &&
      !isFloatDType(this.tensorView.spec.dtype)
    ) {
      throw new Error(
        `Rendering dtype ${this.tensorView.spec.dtype} is not supported yet.`
      );
    }
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
    if (this.headerSection === null) {
      throw new Error(
        'Rendering tensor info failed due to mising header section'
      );
    }
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
    if (this.infoSubsection == null) {
      throw new Error(
        'Rendering tensor name failed due to missing info subsection.'
      );
    }
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
    if (this.infoSubsection == null) {
      throw new Error(
        'Rendering tensor dtype failed due to missing info subsection.'
      );
    }
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
    if (this.infoSubsection == null) {
      throw new Error(
        'Rendering tensor shape failed due to missing info subsection.'
      );
    }
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
   * Fill in the content of the value divs given the current slicing spec.
   */
  private async renderValues() {
    if (this.rank > 2 && this.slicingSpecRoot === null) {
      this.slicingSpecRoot = document.createElement('div');
      this.slicingSpecRoot.classList.add('tensor-widget-slicing-group');
      this.rootElement.appendChild(this.slicingSpecRoot);
    }

    if (this.valueSection == null) {
      this.valueSection = document.createElement('div');
      this.valueSection.classList.add('tensor-widget-value-section');
      this.rootElement.appendChild(this.valueSection);

      // TODO(cais): Conditionally set wheel event listener: only when an
      // element or mutiple elements are selected in the TensorWidget,
      // when selection is supported.
      this.valueSection.addEventListener('wheel', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        await this.scrollUpOrDown(event.deltaY > 0 ? 'down' : 'up');
      });
    }

    this.clearValueSection();
    this.createTopRuler();
    this.createLeftRuler();
    this.createValueDivs();
    await this.renderRulersAndValueDivs();

    if (this.rank > 2) {
      this.slicingControl = new SlicingControl(
        this.slicingSpecRoot as HTMLDivElement,
        this.tensorView.spec.shape,
        async (slicingSpec: TensorViewSlicingSpec) => {
          if (!areSlicingSpecsCompatible(this.slicingSpec, slicingSpec)) {
            this.slicingSpec = JSON.parse(JSON.stringify(slicingSpec));
            // The dimension arrangement has changed in the slicing spec.
            // The rulers and value divs must be re-created. This is why
            // `render()` is called instead of `renderRulersAndValueDivs()`.
            await this.render();
          } else {
            this.slicingSpec = JSON.parse(JSON.stringify(slicingSpec));
            await this.renderRulersAndValueDivs();
          }
        }
      );
      this.slicingControl.render(this.slicingSpec);
    }
  }

  private clearValueSection() {
    if (this.valueSection === null) {
      return;
    }
    while (this.valueSection.firstChild) {
      this.valueSection.removeChild(this.valueSection.firstChild);
    }
    this.topRuler = null;
    this.valueRows = [];
  }

  /**
   * Creates the top ruler.
   *
   * The top ruler includes the topleft-most ruler block, in addition to the
   * column-wise ruler blocks.
   */
  private createTopRuler() {
    if (this.valueSection === null) {
      throw new Error(
        'Failed to create top ruler due to missing value section.'
      );
    }
    if (this.topRuler == null) {
      this.topRuler = document.createElement('div');
      this.topRuler.classList.add('tenesor-widget-top-ruler');
      this.valueSection.appendChild(this.topRuler);
      this.topRulerTicks = [];

      // TODO(cais): Conditionally set wheel event listener: only when
      // an element or mutiple elements are selected in the TensorWidget,
      // when selection is supported.
      this.topRuler.addEventListener('wheel', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        await this.scrollLeftOrRight(event.deltaY > 0 ? 'right' : 'left');
      });
    }

    while (this.topRuler.firstChild) {
      this.topRuler.removeChild(this.topRuler.firstChild);
    }

    this.baseRulerTick = document.createElement('div');
    this.baseRulerTick.classList.add('tensor-widget-top-ruler-tick');
    this.topRuler.appendChild(this.baseRulerTick);

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
    this.colsCutoff = false;
    for (let i = 0; i < maxNumCols; ++i) {
      const tick = document.createElement('div');
      tick.classList.add('tensor-widget-top-ruler-tick');
      this.topRuler.appendChild(tick);
      this.topRulerTicks.push(tick);
      if (tick.getBoundingClientRect().right >= rootElementRight) {
        // The tick has gone out of the right bound of the tensor widget.
        if (this.rank >= 2) {
          if (this.slicingSpec.horizontalRange === null) {
            throw new Error(
              `Missing horizontal range for ${this.rank}D tensor.`
            );
          }
          this.slicingSpec.horizontalRange[1] = i + 1;
          this.colsCutoff = true;
        }
        break;
      }
    }
    if (!this.colsCutoff && this.rank >= 2) {
      if (this.slicingSpec.horizontalRange === null) {
        throw new Error(`Missing horizontal range for ${this.rank}D tensor.`);
      }
      this.slicingSpec.horizontalRange[1] = maxNumCols;
    }
  }

  private createLeftRuler() {
    if (this.valueSection === null) {
      throw new Error(
        'Failed to create left ruler due to missing value section.'
      );
    }
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
    this.rowsCutoff = false;
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
          if (this.slicingSpec.verticalRange === null) {
            throw new Error(`Missing vertical range for ${this.rank}D tensor.`);
          }
          this.slicingSpec.verticalRange[1] = i + 1;
          this.rowsCutoff = true;
        }
        break;
      }
    }
    if (!this.rowsCutoff && this.rank >= 1) {
      if (this.slicingSpec.verticalRange === null) {
        throw new Error(`Missing vertical range for ${this.rank}D tensor.`);
      }
      this.slicingSpec.verticalRange[1] = maxNumRows;
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
    if (this.valueRows === null) {
      throw new Error('Value rows are unexpectedly uninitialized.');
    }

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

  /**
   * Render the content of the top ruler ticks based on current slicing spec.
   *
   * The top ruler ticks show the currently displayed column indices.
   */
  private renderTopRuler() {
    if (this.rank >= 2) {
      const numCols = this.tensorView.spec.shape[
        this.slicingSpec.viewingDims[1]
      ];
      for (let i = 0; i < this.topRulerTicks.length; ++i) {
        if (this.slicingSpec.horizontalRange === null) {
          throw new Error(`Missing horizontal range for ${this.rank}D tensor.`);
        }
        const colIndex = this.slicingSpec.horizontalRange[0] + i;
        if (colIndex < numCols) {
          this.topRulerTicks[i].textContent = `${colIndex}`;
        } else {
          this.topRulerTicks[i].textContent = ``;
        }
      }
    }
  }

  /**
   * Render the content of the left ruler ticks based on current slicing spec.
   *
   * The left ruler ticks show the currently displayed row indices.
   */
  private renderLeftRuler() {
    if (this.rank >= 1) {
      const numRows = this.tensorView.spec.shape[
        this.slicingSpec.viewingDims[0]
      ];
      for (let i = 0; i < this.leftRulerTicks.length; ++i) {
        if (this.slicingSpec.verticalRange === null) {
          throw new Error(`Missing vertcial range for ${this.rank}D tensor.`);
        }
        const rowIndex = this.slicingSpec.verticalRange[0] + i;
        if (rowIndex < numRows) {
          this.leftRulerTicks[i].textContent = `${rowIndex}`;
        } else {
          this.leftRulerTicks[i].textContent = '';
        }
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
    const values = await this.tensorView.view(this.slicingSpec);
    // TODO(cais): Once health pills are available, use the min / max values to determine
    // # of decimal places.
    // TODO(cais): Add hover popup card for the value divs.
    if (this.rank === 0) {
      this.valueDivs[0][0].textContent = numericValueToString(
        values as number,
        isIntegerDType(this.tensorView.spec.dtype)
      );
    } else if (this.rank === 1) {
      for (let i = 0; i < numRows; ++i) {
        const valueDiv = this.valueDivs[i][0];
        if (i < (values as number[]).length) {
          valueDiv.textContent = numericValueToString(
            (values as number[])[i],
            isIntegerDType(this.tensorView.spec.dtype)
          );
        } else {
          valueDiv.textContent = '';
        }
      }
    } else if (this.rank >= 2) {
      for (let i = 0; i < numRows; ++i) {
        for (let j = 0; j < numCols; ++j) {
          const valueDiv = this.valueDivs[i][j];
          if (
            i < (values as number[][]).length &&
            j < (values as number[][])[i].length
          ) {
            valueDiv.textContent = numericValueToString(
              (values as number[][])[i][j],
              isIntegerDType(this.tensorView.spec.dtype)
            );
          } else {
            valueDiv.textContent = '';
          }
        }
      }
    }
  }

  /**
   * Fill in the content of the top/left rulers and main value divs
   * based on the current slicing spec.
   */
  private async renderRulersAndValueDivs() {
    if (this.slicingControl != null) {
      this.slicingControl.setSlicingSpec(this.slicingSpec);
    }
    this.renderTopRuler();
    this.renderLeftRuler();
    await this.renderValueDivs();
  }

  /**
   * Scroll horizontally to a specified column index.
   *
   * This is a no-op for scalar (0D) and 1D tensors.
   * If the column index is out of bound under the current slicing spec,
   * an error will be thrown.
   *
   * @param index
   */
  async scrollHorizontally(index: number) {
    if (this.rank <= 1) {
      // Cannot scroll the display of a scalar or 1D tensor.
      return;
    }
    if (this.slicingSpec.horizontalRange === null) {
      throw new Error(`Missing horizontal range for ${this.rank}D tensor.`);
    }
    const indexUpperBound = this.tensorView.spec.shape[
      this.slicingSpec.viewingDims[1]
    ];
    if (index < 0 || index >= indexUpperBound) {
      throw new Error(
        `Index out of bound: ${index} is outside [0, ${indexUpperBound}])`
      );
    }

    this.slicingSpec.horizontalRange[0] = index;
    this.slicingSpec.horizontalRange[1] = index + this.topRulerTicks.length;
    const maxCol = this.tensorView.spec.shape[this.slicingSpec.viewingDims[1]];
    if (this.slicingSpec.horizontalRange[1] > maxCol) {
      this.slicingSpec.horizontalRange[1] = maxCol;
    }

    await this.renderRulersAndValueDivs();
  }

  /**
   * Scroll vertically to a specified row index.
   *
   * This is a no-op for scalar (0D) tensors.
   * If the row index is out of bound under the current slicing spec,
   * an error will be thrown.
   *
   * @param index
   */
  async scrollVertically(index: number) {
    if (this.rank === 0) {
      // Cannot scroll the display of a scalar.
      return;
    }
    if (this.slicingSpec.verticalRange === null) {
      throw new Error(`Missing vertical range for ${this.rank}D tensor.`);
    }
    if (this.valueRows === null) {
      throw new Error('Vertical scrolling failed due to missing value rows.');
    }

    const indexUpperBound = this.tensorView.spec.shape[
      this.slicingSpec.viewingDims[0]
    ];
    if (index < 0 || index >= indexUpperBound) {
      throw new Error(
        `Index out of bound: ${index} is outside [0, ${indexUpperBound}])`
      );
    }

    this.slicingSpec.verticalRange[0] = index;
    this.slicingSpec.verticalRange[1] = index + this.valueRows.length;
    const maxRow = this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]];
    if (this.slicingSpec.verticalRange[1] > maxRow) {
      this.slicingSpec.verticalRange[1] = maxRow;
    }

    await this.renderRulersAndValueDivs();
  }

  protected async scrollUpOrDown(direction: 'down' | 'up') {
    if (this.rank === 0) {
      // Cannot scroll the display of a scalar.
      return;
    }
    if (!this.rowsCutoff) {
      // Cannot scroll vertically when all rows are shown.
      return;
    }
    if (this.slicingSpec.verticalRange === null) {
      throw new Error(`Missing vertical range for ${this.rank}D tensor.`);
    }
    if (this.valueRows === null) {
      throw new Error('Vertical scrolling failed due to missing value rows.');
    }
    const currRowIndex = this.slicingSpec.verticalRange[0];
    if (direction === 'down') {
      const numRowsShown = this.valueRows.length - 1;
      const maxRow =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]] -
        numRowsShown;
      if (currRowIndex < maxRow) {
        await this.scrollVertically(currRowIndex + 1);
      }
    } else {
      // direction is 'up'.
      if (currRowIndex - 1 >= 0) {
        await this.scrollVertically(currRowIndex - 1);
      }
    }
  }

  protected async scrollLeftOrRight(direction: 'left' | 'right') {
    if (this.rank <= 1) {
      // Cannot horizontally scroll the display a scalar or 1D tensor.
      return;
    }
    if (!this.colsCutoff) {
      // Cannot scroll horizontally when all rows are shown.
      return;
    }
    if (this.slicingSpec.horizontalRange === null) {
      throw new Error(
        `Horizontal scrolling failed due to missing horizontal range.`
      );
    }
    const currColIndex = this.slicingSpec.horizontalRange[0];
    if (direction === 'right') {
      const numColsShown = this.topRulerTicks.length - 1;
      const maxCol =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[1]] -
        numColsShown;
      if (currColIndex < maxCol) {
        await this.scrollHorizontally(currColIndex + 1);
      }
    } else {
      // direction is 'left'.
      if (currColIndex - 1 >= 0) {
        await this.scrollHorizontally(currColIndex - 1);
      }
    }
  }

  async navigateToIndices(indices: number[]) {
    throw new Error('navigateToIndices() is not implemented yet.');
  }
}
