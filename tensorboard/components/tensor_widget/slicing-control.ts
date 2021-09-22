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

import {getDefaultSlicingSpec} from './shape-utils';
import {Shape, TensorViewSlicingSpec} from './types';

export type OnSlicingSpecChangeCallback = (
  slicingSpec: TensorViewSlicingSpec
) => void;

/**
 * UI control for
 * - selecting which dimensions to slicing down to 1 and which to view
 *   as a 2D data table.
 * - which index to select within each sliced dimension.
 *
 * Used for tensors with rank (dimensionality) 3 or higher.
 */
export class SlicingControl {
  private readonly rank: number;

  // The current slicing spec.
  private slicingSpec: TensorViewSlicingSpec;

  // Constituent UI components.
  private dimControls: HTMLDivElement[] = [];
  // Input elements for selecting the slices in sliced dimensions.
  private dimInputs: HTMLInputElement[] = [];
  // Displayed commas.
  private commas: HTMLDivElement[] = [];
  // Dropdown mini-menus to allow swapping a viewed dimension with another
  // dimension.
  private dropdowns: HTMLDivElement[] = [];
  // Static divs that display brackets ("[" and "]") on the two sides.
  private readonly bracketDivs: [HTMLDivElement | null, HTMLDivElement | null] =
    [null, null];

  private dimControlsListenerAttached: boolean[] = [];

  /**
   * Constructor of SlicingControl.
   *
   * @param rootDiv The div element in which all the UI components will be
   *   rendered.
   * @param shape Shape of the tensor.
   * @param onSlicingSpecChange User specified callback for slicing spec changes
   *   triggered by user interactions with this SlicingControl. The callback
   *   will be invoked for changes in:
   *   - which dimensions are used for slicing and which for viewing
   *   - the selected index within a slicing dimension.
   */
  constructor(
    private readonly rootDiv: HTMLDivElement,
    private readonly shape: Shape,
    private readonly onSlicingSpecChange: OnSlicingSpecChangeCallback = () => {}
  ) {
    this.rank = this.shape.length;
    if (this.rank < 3) {
      throw new Error(
        `Dimension control is not applicable to tensor shapes less than ` +
          `3D: received ${this.rank}D tensor shape: ` +
          `${JSON.stringify(this.shape)}.`
      );
    }
    this.createComponents();
    this.slicingSpec = getDefaultSlicingSpec(shape);
  }

  /**
   * Create all UI components of this SlicingControl.
   *
   * The detailed contents of the components are not filled in. Those are filled
   * in when the `render()` method is called.
   */
  private createComponents() {
    // Clear the dim group.
    while (this.rootDiv.firstChild) {
      this.rootDiv.removeChild(this.rootDiv.firstChild);
    }
    this.dimControls = [];
    this.dimInputs = [];
    this.commas = [];
    this.dropdowns = [];
    this.dimControlsListenerAttached = [];

    // Create the div elements for the brackets and the dim controls.
    this.bracketDivs[0] = document.createElement('div');
    this.bracketDivs[0].textContent = 'Slicing: [';
    this.bracketDivs[0].classList.add('tensor-widget-dim-brackets');
    this.rootDiv.appendChild(this.bracketDivs[0]);

    for (let i = 0; i < this.rank; ++i) {
      const dimControl = document.createElement('div');
      dimControl.classList.add('tensor-widget-dim');
      dimControl.title = `Dimension ${i}: size=${this.shape[i]}`;
      this.rootDiv.appendChild(dimControl);
      this.dimControls.push(dimControl);

      this.dimControlsListenerAttached.push(false);

      const dimInput = document.createElement('input');
      dimInput.classList.add('tensor-widget-dim');
      // The dim input is initially hidden, and will be shown when the
      // corresponding dim control is clicked.
      dimInput.style.display = 'none';
      this.rootDiv.appendChild(dimInput);
      this.dimInputs.push(dimInput);

      if (i < this.rank - 1) {
        // Render a comma
        const comma = document.createElement('div');
        comma.classList.add('tensor-widget-dim-comma');
        comma.textContent = ',';
        this.rootDiv.appendChild(comma);
        this.commas.push(comma);
      }

      const dropdown = document.createElement('div');
      dropdown.classList.add('tensor-widget-dim-dropdown');
      // The dropdown is initially hidden, and will be shown when the
      // corresponding dim control is clicked.
      dropdown.style.display = 'none';
      this.rootDiv.appendChild(dropdown);
      this.dropdowns.push(dropdown);
    }

    this.bracketDivs[1] = document.createElement('div');
    this.bracketDivs[1].textContent = ']';
    this.bracketDivs[1].classList.add('tensor-widget-dim-brackets');
    this.rootDiv.appendChild(this.bracketDivs[1]);

    this.rootDiv.addEventListener('mouseleave', () => {
      this.clearAllDropdowns();
    });
  }

  /**
   * Re-render the slicing control according to the current slicing spec.
   */
  render(slicingSpec?: TensorViewSlicingSpec) {
    if (slicingSpec != null) {
      this.slicingSpec = JSON.parse(
        JSON.stringify(slicingSpec)
      ) as TensorViewSlicingSpec;
    }
    if (this.slicingSpec === null) {
      throw new Error(
        'Slicing control rendering failed due to missing slicing spec.'
      );
    }

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.dim
    );
    const slicingIndices = this.slicingSpec.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.index
    );
    for (let i = 0; i < this.rank; ++i) {
      const dimControl = this.dimControls[i];
      const dimInput = this.dimInputs[i];
      const dropdown = this.dropdowns[i];
      if (dimInput.style.display !== 'none') {
        // This dimension is currently being adjusted for slicing index. Skip
        // rendering.
        continue;
      }

      const dimSize = this.shape[i];
      if (slicingDims.indexOf(i) !== -1) {
        // This is a dimension being sliced down to a size of 1.
        const currentIndex = slicingIndices[slicingDims.indexOf(i)];
        dimControl.textContent = String(currentIndex);

        dimInput.classList.add('tensor-widget-dim');
        dimInput.type = 'number';
        dimInput.min = '0';
        dimInput.max = String(dimSize - 1);
        dimInput.value = String(currentIndex);

        // When the dim control is clicked, it becomes a number input.
        if (!this.dimControlsListenerAttached[i]) {
          dimControl.addEventListener('click', () => {
            this.clearAllDropdowns();
            dimControl.style.display = 'none';
            dimInput.style.display = 'inline-block';
          });

          // Set change callback for the dim input.
          dimInput.addEventListener('change', () => {
            if (this.slicingSpec === null) {
              throw new Error(
                'Slicing control change callback failed due to missing spec.'
              );
            }
            const newIndex = parseInt(dimInput.value, 10);
            if (
              !isFinite(newIndex) ||
              newIndex < 0 ||
              newIndex >= dimSize ||
              Math.floor(dimSize) != dimSize
            ) {
              // Reject invalid value.
              dimInput.value = String(
                this.slicingSpec.slicingDimsAndIndices[slicingDims.indexOf(i)]
                  .index
              );
              return;
            }
            this.slicingSpec.slicingDimsAndIndices[
              slicingDims.indexOf(i)
            ].index = newIndex;
            dimControl.textContent = String(newIndex);
            this.onSlicingSpecChange(this.slicingSpec);
          });

          // When defocusing (blurring) from the dim input, it changes back into
          // a static div.
          dimInput.addEventListener('blur', () => {
            dimInput.style.display = 'none';
            dimControl.style.display = 'inline-block';
          });

          this.dimControlsListenerAttached[i] = true;
        }
      } else {
        if (this.slicingSpec.viewingDims[0] === i) {
          // This is a dimension being viewed as the vertical (rows) dimension.
          if (this.slicingSpec.verticalRange === null) {
            throw new Error('Missing vertical range.');
          }
          dimControl.textContent =
            `↕ ${this.slicingSpec.verticalRange[0]}:` +
            `${this.slicingSpec.verticalRange[1]}`;
        } else {
          // This is a dimension being viewed as the horizontal (columns)
          // dimension.
          if (this.slicingSpec.horizontalRange === null) {
            throw new Error('Missing horizontal range.');
          }
          dimControl.textContent =
            `↔ ${this.slicingSpec.horizontalRange[0]}:` +
            `${this.slicingSpec.horizontalRange[1]}`;
        }
        dimControl.classList.add('tensor-widget-dim');
        if (!this.dimControlsListenerAttached[i]) {
          dimControl.addEventListener('click', () => {
            const rect = dimControl.getBoundingClientRect();
            const top = rect.bottom;
            const left = rect.left;
            this.renderDropdownMenuItems(dropdown, top, left, i);
          });
          this.dimControlsListenerAttached[i] = true;
        }
      }
    }
  }

  /**
   * Render items in a viewing dimension's dropdown menu.
   *
   * The rendering is based on what dimension swappings are possible.
   * The dropdown menu will be shown if it is non-empty after the menu items are
   * populated.
   *
   * @param dropdown
   * @param top The top coordinate of the menu.
   * @param left The left coordinate of the menu.
   * @param dim The dimension that the viewing dimension belongs to. E.g., `0`
   *   for the first dimension.
   */
  private renderDropdownMenuItems(
    dropdown: HTMLDivElement,
    top: number,
    left: number,
    dim: number
  ) {
    if (this.slicingSpec === null) {
      throw new Error(
        'Slicing control cannot render dropdown menu items due to missing ' +
          'slicing spec.'
      );
    }

    // Clear all dropdown menus. Make sure that at any moment, only one dropdown
    // menu is open.
    this.clearAllDropdowns();

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      (dimAndIndex) => dimAndIndex.dim
    );
    for (let i = 0; i < this.rank; ++i) {
      // Create "Swap with" menu items only with slicing dimensions, i.e., not
      // with viewing dimensions.
      if (slicingDims.indexOf(i) === -1) {
        continue;
      }
      // Also, do not allow the second (columns) viewing dimension to be before
      // the first one.
      if (
        (dim === this.slicingSpec.viewingDims[1] &&
          i <= this.slicingSpec.viewingDims[0]) ||
        (dim == this.slicingSpec.viewingDims[0] &&
          i >= this.slicingSpec.viewingDims[1])
      ) {
        continue;
      }

      const menuItem = document.createElement('div');
      menuItem.classList.add('tensor-widget-dim-dropdown-menu-item');
      menuItem.textContent = `Swap with dimension ${i}`;
      dropdown.appendChild(menuItem);
      menuItem.addEventListener('mouseenter', () => {
        menuItem.classList.add('tensor-widget-dim-dropdown-menu-item-active');
        this.dimControls[i].classList.add('tensor-widget-dim-highlighted');
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.classList.remove(
          'tensor-widget-dim-dropdown-menu-item-active'
        );
        this.dimControls[i].classList.remove('tensor-widget-dim-highlighted');
      });

      const isFirstViewingDim = this.slicingSpec.viewingDims[0] === dim;
      menuItem.addEventListener('click', () => {
        if (this.slicingSpec === null) {
          throw new Error(
            'Dimension swapping failed due to missing slicing spec'
          );
        }
        const k = slicingDims.indexOf(i);
        this.slicingSpec.viewingDims[isFirstViewingDim ? 0 : 1] = i;
        this.slicingSpec.slicingDimsAndIndices[k] = {
          dim,
          index: 0,
        };
        this.slicingSpec.verticalRange = null;
        this.slicingSpec.horizontalRange = null;
        if (this.onSlicingSpecChange) {
          this.onSlicingSpecChange(this.slicingSpec);
        }
      });
    }

    dropdown.addEventListener('mouseleave', () => {
      dropdown.style.display = 'none';
    });

    // Show the dropdown menu if and only if it is non-empty.
    if (dropdown.firstChild) {
      dropdown.style.position = 'fixed';
      dropdown.style.top = `${top}px`;
      dropdown.style.left = `${left}px`;
      dropdown.style.display = 'block';

      // Check the actual position of the dropdown menu and make sure
      // that it's actually aligned with the dim control.
      // TODO(cais): Investigate for the offset in the Debugger Plugin
      // and whether there is a way to avoid the hacky repositioning below.
      const actualRect = dropdown.getBoundingClientRect();
      const topOffset = actualRect.top - top;
      const leftOffset = actualRect.left - left;
      dropdown.style.top = (top - topOffset).toFixed(1) + 'px';
      dropdown.style.left = (left - leftOffset).toFixed(1) + 'px';
    }
  }

  /**
   * Set the slicing spec externally.
   *
   * This will trigger a re-rendering of the SlicingControl's UI components,
   * which will reflect the input slicing spec's value.
   *
   * @param slicingSpec The externally-set slicing spec. It will not be mutated
   *   by SlicingControl.
   */
  setSlicingSpec(slicingSpec: TensorViewSlicingSpec) {
    this.slicingSpec = JSON.parse(
      JSON.stringify(slicingSpec)
    ) as TensorViewSlicingSpec;
    if (this.slicingSpec === null) {
      throw new Error('Cannot set slicing spec to null.');
    }
    this.render(this.slicingSpec);
  }

  private clearAllDropdowns() {
    this.dropdowns.forEach((dropdown) => {
      if (dropdown != null) {
        while (dropdown.firstChild) {
          dropdown.removeChild(dropdown.firstChild);
        }
        dropdown.style.display = 'none';
      }
    });
  }
}
