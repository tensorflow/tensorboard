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

import {
  ColorMap,
  ColorMapConfig,
  GrayscaleColorMap,
  JetColorMap,
} from './colormap';
import {
  isBooleanDType,
  isFloatDType,
  isIntegerDType,
  isStringDType,
} from './dtype-utils';
import {
  BaseTensorNumericSummary,
  BooleanOrNumericTensorNumericSummary,
} from './health-pill-types';
import {
  ChoiceMenuItemConfig,
  Menu,
  MenuConfig,
  SingleActionMenuItemConfig,
} from './menu';
import {TensorElementSelection} from './selection';
import {
  areSlicingSpecsCompatible,
  formatShapeForDisplay,
  getDefaultSlicingSpec,
} from './shape-utils';
import {SlicingControl} from './slicing-control';
import {
  booleanValueToDisplayString,
  formatTensorName,
  numericValueToString,
  stringValueToDisplayString,
} from './string-utils';
import {
  MoveDirection,
  TensorView,
  TensorViewSlicingSpec,
  TensorWidget,
  TensorWidgetOptions,
} from './types';

const DETAILED_VALUE_ATTR_KEY = 'detailed-value';

type ValueClass = 'numeric' | 'boolean' | 'string';

enum ValueRenderMode {
  TEXT = 1,
  IMAGE = 2,
}

/**
 * Implementation of TensorWidget.
 */

/** Color-map look-up table. */
const colorMaps: {
  [colorMapName: string]: new (config: ColorMapConfig) => ColorMap;
} = {
  Grayscale: GrayscaleColorMap,
  Jet: JetColorMap,
};

/** An implementation of TensorWidget single-tensor view. */
export class TensorWidgetImpl implements TensorWidget {
  private readonly options: TensorWidgetOptions;
  protected rank: number;

  // Constituent UI elements.
  protected headerSection: HTMLDivElement | null = null;
  protected infoSubsection: HTMLDivElement | null = null;
  protected menuThumb: HTMLDivElement | null = null;

  protected slicingSpecRoot: HTMLDivElement | null = null;
  protected valueSection: HTMLDivElement | null = null;
  protected topRuler: HTMLDivElement | null = null;
  protected baseRulerTick: HTMLDivElement | null = null;
  protected topRulerTicks: HTMLDivElement[] = [];
  protected leftRulerTicks: HTMLDivElement[] = [];
  protected valueRows: HTMLDivElement[] = [];
  protected valueDivs: HTMLDivElement[][] = [];

  protected valueTooltip: HTMLDivElement | null = null;

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

  // Element selection.
  protected selection: TensorElementSelection | null = null;

  // Menu configuration.
  protected menuConfig: MenuConfig | null = null;
  // Menu object.
  private menu: Menu | null = null;

  // Value render mode.
  protected valueRenderMode: ValueRenderMode;

  // Name of color map (takes effect on IMAGE value render mode only).
  protected colorMapName: string = 'Grayscale';
  protected colorMap: ColorMap | null = null;

  // Whether indices should be rendered on ruler ticks on the top and left.
  // Determined dynamically based on the current size of the ticks.
  protected showIndicesOnTicks: boolean = false;

  // Size of each cell used to display the tensor value under the 'image' mode.
  protected imageCellSize = 16;
  protected readonly minImageCellSize = 4;
  protected readonly maxImageCellSize = 40;
  protected readonly zoomStepRatio = 1.2;

  protected numericSummary: BaseTensorNumericSummary | null = null;

  constructor(
    private readonly rootElement: HTMLDivElement,
    private readonly tensorView: TensorView,
    options?: TensorWidgetOptions
  ) {
    this.options = options || {};
    this.slicingSpec = getDefaultSlicingSpec(this.tensorView.spec.shape);
    this.rank = this.tensorView.spec.shape.length;
    this.valueRenderMode = ValueRenderMode.TEXT;
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
      !isFloatDType(this.tensorView.spec.dtype) &&
      !isBooleanDType(this.tensorView.spec.dtype) &&
      !isStringDType(this.tensorView.spec.dtype)
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
      this.createMenu();
    }
    this.renderInfo();
    // TODO(cais): Implement and call renderHealthPill().
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

  private createMenu() {
    this.menuConfig = {items: []};
    if (
      isFloatDType(this.tensorView.spec.dtype) ||
      isIntegerDType(this.tensorView.spec.dtype) ||
      isBooleanDType(this.tensorView.spec.dtype)
    ) {
      this.menuConfig.items.push({
        caption: 'Select display mode...',
        options: ['Text', 'Image'],
        defaultSelection: 0,
        callback: (currentMode: number) => {
          if (currentMode === 0) {
            this.valueRenderMode = ValueRenderMode.TEXT;
            this.renderValues();
          } else {
            this.valueRenderMode = ValueRenderMode.IMAGE;
            this.tensorView.getNumericSummary().then((numericSummary) => {
              this.numericSummary = numericSummary;
              this.renderValues();
            });
          }
        },
      } as ChoiceMenuItemConfig);

      this.menuConfig.items.push({
        caption: 'Select color map...',
        options: Object.keys(colorMaps),
        defaultSelection: 0,
        callback: (currentMode: number) => {
          this.colorMapName = Object.keys(colorMaps)[currentMode];
          this.renderValues();
        },
        isEnabled: () => this.valueRenderMode === ValueRenderMode.IMAGE,
      } as ChoiceMenuItemConfig);

      this.menuConfig.items.push({
        caption: 'Zoom in (Image mode)',
        callback: () => {
          this.zoomInOneStepAndRenderValues();
        },
        isEnabled: () => this.valueRenderMode === ValueRenderMode.IMAGE,
      } as SingleActionMenuItemConfig);
      this.menuConfig.items.push({
        caption: 'Zoom out (Image mode)',
        callback: () => {
          this.zoomOutOneStepAndRenderValues();
        },
        isEnabled: () => this.valueRenderMode === ValueRenderMode.IMAGE,
      } as SingleActionMenuItemConfig);
    }
    if (this.menuConfig !== null && this.menuConfig.items.length > 0) {
      this.menu = new Menu(
        this.menuConfig,
        this.headerSection as HTMLDivElement
      );
      this.renderMenuThumb();
    }
  }

  private zoomInOneStepAndRenderValues() {
    if (this.imageCellSize * this.zoomStepRatio <= this.maxImageCellSize) {
      this.imageCellSize *= this.zoomStepRatio;
      this.renderValues();
    }
  }

  private zoomOutOneStepAndRenderValues() {
    if (this.imageCellSize / this.zoomStepRatio >= this.minImageCellSize) {
      this.imageCellSize /= this.zoomStepRatio;
      this.renderValues();
    }
  }

  /** Render the thumb that when clicked, toggles the menu display state. */
  private renderMenuThumb() {
    if (this.headerSection == null) {
      throw new Error(
        'Rendering menu thumb failed due to missing header section.'
      );
    }
    this.menuThumb = document.createElement('div');
    this.menuThumb.textContent = '⋮';
    this.menuThumb.classList.add('tensor-widget-menu-thumb');
    this.headerSection.appendChild(this.menuThumb);

    // let menuShown = false;  // TODO(cais): Make a class member?
    this.menuThumb.addEventListener('click', () => {
      if (this.menu === null) {
        return;
      }
      if (this.menu.shown()) {
        this.menu.hide();
      } else {
        const rect = (this.menuThumb as HTMLDivElement).getBoundingClientRect();
        const top = rect.bottom;
        const left = rect.left;
        this.menu.show(top, left);
      }
    });
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

      this.valueSection.addEventListener('wheel', async (event) => {
        let zoomKeyPressed = false;
        if (
          this.options.wheelZoomKey == null ||
          this.options.wheelZoomKey === 'ctrl'
        ) {
          zoomKeyPressed = event.ctrlKey;
        } else if (this.options.wheelZoomKey === 'alt') {
          zoomKeyPressed = event.altKey;
        } else if (this.options.wheelZoomKey === 'shift') {
          zoomKeyPressed = event.shiftKey;
        }
        if (zoomKeyPressed && this.valueRenderMode === ValueRenderMode.IMAGE) {
          event.stopPropagation();
          event.preventDefault();
          if (event.deltaY > 0) {
            this.zoomOutOneStepAndRenderValues();
          } else {
            this.zoomInOneStepAndRenderValues();
          }
          return;
        }

        if (this.selection == null) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        this.hideValueTooltip();
        await this.scrollUpOrDown(
          event.deltaY > 0 ? MoveDirection.DOWN : MoveDirection.UP
        );
      });

      // Add event listener for the value section.
      this.valueSection.tabIndex = 1024;
      this.valueSection.addEventListener('keydown', (event) => {
        const UP_KEYCODE = 38;
        const DOWN_KEYCODE = 40;
        const LEFT_KEYCODE = 37;
        const RIGHT_KEYCODE = 39;
        const VALID_KEYCODES = [
          UP_KEYCODE,
          DOWN_KEYCODE,
          LEFT_KEYCODE,
          RIGHT_KEYCODE,
        ];
        if (
          this.selection != null &&
          VALID_KEYCODES.indexOf(event.keyCode) !== -1
        ) {
          event.stopPropagation();
          event.preventDefault();
          this.hideValueTooltip();
          let slicingMoveDirection: MoveDirection | null = null;
          let moveDirection: MoveDirection | null = null;
          if (event.keyCode === UP_KEYCODE) {
            moveDirection = MoveDirection.UP;
          } else if (event.keyCode === DOWN_KEYCODE) {
            moveDirection = MoveDirection.DOWN;
          } else if (event.keyCode === LEFT_KEYCODE) {
            moveDirection = MoveDirection.LEFT;
          } else if (event.keyCode === RIGHT_KEYCODE) {
            moveDirection = MoveDirection.RIGHT;
          }

          if (moveDirection !== null) {
            slicingMoveDirection = this.selection.move(
              moveDirection,
              this.slicingSpec
            );
          }

          // The selection movement may necessitate a change in the vertical or
          // horizontal view.
          if (slicingMoveDirection === null) {
            this.renderSelection();
          } else if (
            slicingMoveDirection === MoveDirection.UP ||
            slicingMoveDirection === MoveDirection.DOWN
          ) {
            this.scrollUpOrDown(slicingMoveDirection);
          } else if (
            slicingMoveDirection === MoveDirection.LEFT ||
            slicingMoveDirection === MoveDirection.RIGHT
          ) {
            this.scrollLeftOrRight(slicingMoveDirection);
          }
        }
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
            this.slicingSpec = JSON.parse(
              JSON.stringify(slicingSpec)
            ) as TensorViewSlicingSpec;
            // The dimension arrangement has changed in the slicing spec.
            // The rulers and value divs must be re-created. This is why
            // `render()` is called instead of `renderRulersAndValueDivs()`.
            await this.render();
          } else {
            this.slicingSpec = JSON.parse(
              JSON.stringify(slicingSpec)
            ) as TensorViewSlicingSpec;
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
      // Force nowrap as this is important to ensure the correct number
      // of columns.
      this.topRuler.style.whiteSpace = 'nowrap';
      this.valueSection.appendChild(this.topRuler);
      this.topRulerTicks = [];

      this.topRuler.addEventListener('wheel', async (event) => {
        if (this.selection == null) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        this.hideValueTooltip();
        await this.scrollLeftOrRight(
          event.deltaY > 0 ? MoveDirection.RIGHT : MoveDirection.LEFT
        );
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
      if (this.valueRenderMode === ValueRenderMode.IMAGE) {
        tick.style.width = `${this.imageCellSize}px`;
      }
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
    this.valueRows = [];
    this.leftRulerTicks = [];

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
      if (this.valueRenderMode === ValueRenderMode.IMAGE) {
        row.style.height = `${this.imageCellSize}px`;
        row.style.lineHeight = `${this.imageCellSize}px`;
      }
      this.valueSection.appendChild(row);
      this.valueRows.push(row);

      const tick = document.createElement('div');
      tick.classList.add('tensor-widget-top-ruler-tick');
      if (this.valueRenderMode === ValueRenderMode.IMAGE) {
        tick.style.height = `${this.imageCellSize}px`;
        tick.style.lineHeight = `${this.imageCellSize}px`;
      }
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
        if (this.valueRenderMode === ValueRenderMode.IMAGE) {
          valueDiv.style.width = `${this.imageCellSize}px`;
          valueDiv.style.height = `${this.imageCellSize}px`;
          valueDiv.style.lineHeight = `${this.imageCellSize}px`;
        }
        this.valueRows[i].appendChild(valueDiv);
        this.valueDivs[i].push(valueDiv);
        valueDiv.addEventListener('click', () => {
          const rowStart =
            this.slicingSpec.verticalRange == null ||
            this.slicingSpec.verticalRange[0] == null
              ? 0
              : this.slicingSpec.verticalRange[0] + i;
          const colStart =
            this.slicingSpec.horizontalRange == null ||
            this.slicingSpec.horizontalRange[0] == null
              ? 0
              : this.slicingSpec.horizontalRange[0] + j;
          // TODO(cais): Support multi-row, multi-column selection.
          const rowCount = 1;
          const colCount = 1;
          this.selection = new TensorElementSelection(
            this.tensorView.spec.shape,
            this.slicingSpec,
            rowStart,
            colStart,
            rowCount,
            colCount
          );
          this.renderSelection();
        });
        valueDiv.addEventListener('mouseenter', () => {
          // On mouse hover, show a tooltip that displays the element's
          // value in a more detailed fashion.
          const detailedValueTooltipString = valueDiv.getAttribute(
            DETAILED_VALUE_ATTR_KEY
          );
          if (detailedValueTooltipString === null) {
            return;
          }
          const rootRect = this.rootElement.getBoundingClientRect();
          const valueRect = valueDiv.getBoundingClientRect();
          const valueHeight = valueRect.bottom - valueRect.top;
          const valueWidth = valueRect.right - valueRect.left;
          const indices = this.calculateIndices(i, j);
          this.drawValueTooltip(
            indices,
            detailedValueTooltipString,
            valueRect.top - rootRect.top + valueHeight * 0.8,
            valueRect.left - rootRect.left + valueWidth * 0.75
          );
        });
        valueDiv.addEventListener('mouseleave', () => {
          this.hideValueTooltip();
        });
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
      const numCols =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[1]];

      for (let i = 0; i < this.topRulerTicks.length; ++i) {
        if (this.slicingSpec.horizontalRange === null) {
          throw new Error(`Missing horizontal range for ${this.rank}D tensor.`);
        }
        const colIndex = this.slicingSpec.horizontalRange[0] + i;
        if (this.showIndicesOnTicks) {
          if (colIndex < numCols) {
            this.topRulerTicks[i].textContent = `${colIndex}`;
          } else {
            this.topRulerTicks[i].textContent = ``;
          }
        } // No text label under the image mode.
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
      const numRows =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]];
      for (let i = 0; i < this.leftRulerTicks.length; ++i) {
        if (this.slicingSpec.verticalRange === null) {
          throw new Error(`Missing vertcial range for ${this.rank}D tensor.`);
        }
        const rowIndex = this.slicingSpec.verticalRange[0] + i;
        if (this.showIndicesOnTicks) {
          if (rowIndex < numRows) {
            this.leftRulerTicks[i].textContent = `${rowIndex}`;
          } else {
            this.leftRulerTicks[i].textContent = '';
          }
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
    let values = await this.tensorView.view(this.slicingSpec);
    if (this.rank === 0) {
      values = [[values as number]];
    } else if (this.rank === 1) {
      values = (values as number[]).map((v) => [v]);
    }

    const valueClass = this.getValueClass();

    let colorMap: ColorMap | null = null;
    const valueRenderMode = this.valueRenderMode;
    if (valueRenderMode === ValueRenderMode.IMAGE) {
      if (this.numericSummary == null) {
        throw new Error(
          'Failed to render image representation of tensor due to ' +
            'missing numeric summary'
        );
      }
      const {minimum, maximum} = this
        .numericSummary as BooleanOrNumericTensorNumericSummary;
      if (minimum == null || maximum == null) {
        throw new Error(
          'Failed to render image representation of tensor due to ' +
            'missing minimum or maximum values in numeric summary'
        );
      }
      const colorMapConfig: ColorMapConfig = {
        min: minimum as number,
        max: maximum as number,
      };
      if (this.colorMapName in colorMaps) {
        this.colorMap = new colorMaps[this.colorMapName](colorMapConfig);
      } else {
        // Color-map name is not found. Use the default: Grayscale colormap.
        this.colorMap = new GrayscaleColorMap(colorMapConfig);
      }
    }

    for (let i = 0; i < numRows; ++i) {
      for (let j = 0; j < numCols; ++j) {
        const valueDiv = this.valueDivs[i][j];
        if (
          i < (values as number[][]).length &&
          j < (values as number[][])[i].length
        ) {
          const value = (values as number[][] | boolean[][] | string[][])[i][j];
          if (valueRenderMode === ValueRenderMode.IMAGE) {
            const [red, green, blue] = (this.colorMap as ColorMap).getRGB(
              value as number
            );
            valueDiv.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
          } else {
            // Here, valueRenderMode is 'text'.
            if (valueClass === 'numeric') {
              // TODO(cais): Once health pills are available, use the min/max
              // values to determine the number of decimal places.
              valueDiv.textContent = numericValueToString(
                value as number,
                isIntegerDType(this.tensorView.spec.dtype)
              );
            } else if (valueClass === 'boolean') {
              valueDiv.textContent = booleanValueToDisplayString(
                value as boolean
              );
            } else if (valueClass === 'string') {
              valueDiv.textContent = stringValueToDisplayString(
                value as string
              );
            }
          }
          // The attribute set below will be rendered in a tooltip that appears
          // on mouse hovering.
          valueDiv.setAttribute(
            DETAILED_VALUE_ATTR_KEY,
            this.getDetailedValueTooltipString(value)
          );
        } else {
          valueDiv.textContent = '';
          valueDiv.setAttribute(DETAILED_VALUE_ATTR_KEY, '');
        }
      }
    }

    this.renderSelection();
  }

  /**
   * Get a "detailed" string representation of the value of the corresponding
   * tensor element. It is detailed in the sense that it has as many
   * decimal points as supported by JavaScript's string representation
   * of numbers, in the case of float dtypes. The only exceptions
   * are very long string elements, which we still truncate in order
   * to avoid overtaxing the DOM.
   */
  private getDetailedValueTooltipString(
    value: boolean | number | string
  ): string {
    if (this.getValueClass() === 'boolean') {
      const shortForm = false;
      return booleanValueToDisplayString(value as boolean, shortForm);
    } else if (this.getValueClass() === 'string') {
      const lengthLimit = 500;
      return `Length-${
        (value as string).length
      } string: "${stringValueToDisplayString(value as string, lengthLimit)}"`;
    } else {
      return String(value);
    }
  }

  /**
   * Update the rendering of the selected value cells (if any).
   */
  private renderSelection() {
    if (this.selection == null) {
      return;
    }
    const numRows = this.valueDivs.length;
    const numCols = this.valueDivs[0].length;
    for (let i = 0; i < numRows; ++i) {
      for (let j = 0; j < numCols; ++j) {
        const valueDiv = this.valueDivs[i][j];
        valueDiv.classList.remove('tensor-widget-value-div-selection');
        valueDiv.classList.remove('tensor-widget-value-div-selection-top');
        valueDiv.classList.remove('tensor-widget-value-div-selection-bottom');
        valueDiv.classList.remove('tensor-widget-value-div-selection-left');
        valueDiv.classList.remove('tensor-widget-value-div-selection-right');
        const indices = this.calculateIndices(i, j);
        const status = this.selection.getElementStatus(indices);
        if (status !== null) {
          valueDiv.classList.add('tensor-widget-value-div-selection');
          if (status.topEdge) {
            valueDiv.classList.add('tensor-widget-value-div-selection-top');
          }
          if (status.bottomEdge) {
            valueDiv.classList.add('tensor-widget-value-div-selection-bottom');
          }
          if (status.leftEdge) {
            valueDiv.classList.add('tensor-widget-value-div-selection-left');
          }
          if (status.rightEdge) {
            valueDiv.classList.add('tensor-widget-value-div-selection-right');
          }
        }
      }
    }
  }

  /**
   * Calculate the set of indices that a value div currently maps to.
   * @param viewRow Row index of the value div, 0-based. This is with respect
   *   to the 2D array of value divs that the widget currently possess, not
   *   with respect to the indices of the underlying tensor. Same below.
   * @param viewCol Column indices of the value div, 0-based.
   * @return The set of indices of the underlying tensor.
   */
  private calculateIndices(viewRow: number, viewCol: number): number[] {
    const indices: number[] = [];
    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.dim
    );
    const slicingIndices = this.slicingSpec.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.index
    );
    for (let i = 0; i < this.rank; ++i) {
      if (slicingDims.indexOf(i) !== -1) {
        const index = slicingIndices[slicingDims.indexOf(i)];
        if (index === null) {
          throw new Error(
            `Failed to calculate indices: ` +
              `Undetermined index at dimension ${i}`
          );
        }
        indices.push(index);
      } else if (i === this.slicingSpec.viewingDims[0]) {
        if (
          this.slicingSpec.verticalRange === null ||
          this.slicingSpec.verticalRange[0] === null
        ) {
          throw new Error(
            'Failed to calculate indices due to undertermined vertical range.'
          );
        }
        indices.push(this.slicingSpec.verticalRange[0] + viewRow);
      } else if (i === this.slicingSpec.viewingDims[1]) {
        if (
          this.slicingSpec.horizontalRange === null ||
          this.slicingSpec.horizontalRange[0] === null
        ) {
          throw new Error(
            'Failed to calculate indices due to undertermined vertical range.'
          );
        }
        indices.push(this.slicingSpec.horizontalRange[0] + viewCol);
      }
    }
    return indices;
  }

  /**
   * Draw tooltip for detailed indices and value.
   * @param indices Indices of the element for which the tooltip is to be drawn.
   * @param detailedValueString A string describing the value in a detailed way,
   *   e.g., with sufficient number of decimal points for a float number value.
   * @param top Top coordinate (in pixels) of the tooltip.
   * @param left Left coordinate (in pixels) of the tooltip.
   */
  private drawValueTooltip(
    indices: number[],
    detailedValueString: string,
    top: number,
    left: number
  ) {
    if (this.valueTooltip === null) {
      this.valueTooltip = document.createElement('div');
      this.valueTooltip.classList.add('tensor-widget-value-tooltip');
      this.rootElement.appendChild(this.valueTooltip);
    }

    while (this.valueTooltip.firstChild) {
      this.valueTooltip.removeChild(this.valueTooltip.firstChild);
    }
    const indicesDiv = document.createElement('div');
    indicesDiv.classList.add('tensor-widget-value-tooltip-indices');
    indicesDiv.textContent = `Indices: ${JSON.stringify(indices)}`;
    this.valueTooltip.appendChild(indicesDiv);

    const valueDiv = document.createElement('div');
    valueDiv.classList.add('tensor-widget-value-tooltip-value');
    valueDiv.textContent = detailedValueString;

    this.valueTooltip.appendChild(valueDiv);
    this.valueTooltip.style.top = `${top}px`;
    this.valueTooltip.style.left = `${left}px`;
    this.valueTooltip.style.display = 'block';

    // If the current render mode is IMAGE, show the color bar and
    // indicate the position of the current element along the color-bar scale.
    if (
      this.valueRenderMode == ValueRenderMode.IMAGE &&
      this.colorMap != null
    ) {
      const colorBarCanvas = document.createElement('canvas');
      colorBarCanvas.classList.add('tensor-widget-value-tooltip-colorbar');
      this.valueTooltip.appendChild(colorBarCanvas);
      this.colorMap.render(colorBarCanvas, parseFloat(detailedValueString));
    }
  }

  private hideValueTooltip() {
    if (this.valueTooltip != null) {
      this.valueTooltip.style.display = 'none';
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
    // Determine if indices should be rendered on ruler ticks.
    this.calculateShowIndicesOnRulerTicks();
    this.renderTopRuler();
    this.renderLeftRuler();
    await this.renderValueDivs();
  }

  /**
   * Determine if indices should be displayed on ruler ticks given
   * the current tick sizes.
   */
  private calculateShowIndicesOnRulerTicks() {
    if (this.rank >= 2) {
      const tickBox = this.topRulerTicks[0].getBoundingClientRect();
      const tickWidth = tickBox.right - tickBox.left;
      const dimSize =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]];
      this.showIndicesOnTicks =
        tickWidth > 9 * Math.ceil(Math.log(dimSize) / Math.LN10);
    } else if (this.rank === 1) {
      const tickBox = this.leftRulerTicks[0].getBoundingClientRect();
      const tickHeight = tickBox.bottom - tickBox.top;
      this.showIndicesOnTicks = tickHeight > 16;
    } else {
      // rank is 0.
      this.showIndicesOnTicks = false;
    }
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
    const indexUpperBound =
      this.tensorView.spec.shape[this.slicingSpec.viewingDims[1]];
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

    const indexUpperBound =
      this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]];
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

  protected async scrollUpOrDown(
    direction: MoveDirection.UP | MoveDirection.DOWN
  ) {
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
    if (direction === MoveDirection.DOWN) {
      const numRowsShown = this.valueRows.length - 1;
      const maxRow =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[0]] -
        numRowsShown;
      if (currRowIndex < maxRow) {
        await this.scrollVertically(currRowIndex + 1);
      }
    } else {
      // direction is up.
      if (currRowIndex - 1 >= 0) {
        await this.scrollVertically(currRowIndex - 1);
      }
    }
  }

  protected async scrollLeftOrRight(
    direction: MoveDirection.LEFT | MoveDirection.RIGHT
  ) {
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
    if (direction === MoveDirection.RIGHT) {
      const numColsShown = this.topRulerTicks.length - 1;
      const maxCol =
        this.tensorView.spec.shape[this.slicingSpec.viewingDims[1]] -
        numColsShown;
      if (currColIndex < maxCol) {
        await this.scrollHorizontally(currColIndex + 1);
      }
    } else {
      // direction is left.
      if (currColIndex - 1 >= 0) {
        await this.scrollHorizontally(currColIndex - 1);
      }
    }
  }

  async navigateToIndices(indices: number[]) {
    throw new Error('navigateToIndices() is not implemented yet.');
  }

  private getValueClass(): ValueClass {
    const dtype = this.tensorView.spec.dtype;
    if (isIntegerDType(dtype) || isFloatDType(dtype)) {
      return 'numeric';
    } else if (isBooleanDType(dtype)) {
      return 'boolean';
    } else {
      return 'string';
    }
  }
}
