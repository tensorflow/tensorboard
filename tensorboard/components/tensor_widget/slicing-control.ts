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

import {Shape, TensorViewSlicingSpec} from "./types";

export type OnSlicingSpecChangeCallback = (slicingSpec: TensorViewSlicingSpec) => void;

/**
 * UI control for selecting which dimensions to slicing down to 1 and which
 * to view. Used for tensors with rank (dimensionality) 3 or higher.
 */
export class SlicingControl {
  private rank: number;

  // The current slicing spec.
  private slicingSpec: TensorViewSlicingSpec;

  // Constituent UI components.
  // private rootDiv: HTMLDivElement;
  private dimControls: HTMLDivElement[];
  // Input elements for selecting the slices in sliced dimensions.
  private dimInputs: HTMLInputElement[];
  // Dropdown mini-menus to allow swapping a viewed dimension with another
  // dimension.
  private dropdowns: HTMLDivElement[];
  // Static divs that display brackets ("[" and "]") on the two sides.
  private bracketDivs: [HTMLDivElement, HTMLDivElement] = [null, null];

  private dimControlsListenerAttached: boolean[];

  /**
   *
   * @param rootDiv
   * @param shape Shape of the tensor.
   * @param initialSlicingSpec The initial slicing spec of the dimension.
   *   DimensionControl will not mutate this object.
   */
  constructor(private readonly rootDiv: HTMLDivElement,
              private readonly shape: Shape,
              private readonly onSlicngSpecChange: OnSlicingSpecChangeCallback) {
    this.rank = this.shape.length;
    if (this.rank < 3) {
      throw new Error(
          `Dimension control is not applicable to tensor shapes less than ` +
          `3D: received ${this.rank}D tensor shape: ` +
          `${JSON.stringify(this.shape)}.`);
    }
    this.createComponents();
  }


  private createComponents() {
    // Clean the dim group.
    while (this.rootDiv.firstChild) {
      this.rootDiv.removeChild(this.rootDiv.firstChild);
    }
    this.dimControls = [];
    this.dimInputs = [];
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
  }

  /**
   * Re-render the slicing control according to the current slicing spec
   */
  render(slicingSpec?: TensorViewSlicingSpec) {
    if (slicingSpec != null) {
      this.slicingSpec = JSON.parse(JSON.stringify(slicingSpec));
    }

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.dim);
    const slicingIndices = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.index);
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
        dimControl.textContent = `${currentIndex}/${dimSize}`;

        dimInput.classList.add('tensor-widget-dim');
        dimInput.type = 'number';
        dimInput.min = '0';
        dimInput.max = `${dimSize - 1}`;
        dimInput.value = `${currentIndex}`;

        // When the dim control is clicked, it becomes a number input.
        if (!this.dimControlsListenerAttached[i]) {
          dimControl.addEventListener('click', () => {
            this.clearAllDropdowns();
            dimControl.style.display = 'none';
            dimInput.style.display = 'inline-block' ;
          });

          // Set change callback for the dim input.
          dimInput.addEventListener('change',  () => {
            const newIndex = parseInt(dimInput.value, 10);
            if (!isFinite(newIndex) || newIndex < 0 || newIndex >= dimSize ||
                Math.floor(dimSize) != dimSize) {
              // Reject invalid value.
              dimInput.value =
                `${this.slicingSpec.slicingDimsAndIndices[slicingDims.indexOf(i)].index}`;
              return;
            }
            this.slicingSpec.slicingDimsAndIndices[slicingDims.indexOf(i)].index =
              newIndex;
            dimControl.textContent = `${newIndex}/${dimSize}`;
            this.onSlicngSpecChange(this.slicingSpec);
          });

          // When defocusing (blurring) from the dim input, it changes back into
          // a div.
          dimInput.addEventListener('blur', () => {
            dimInput.style.display = 'none';
            dimControl.style.display = 'inline-block';
          });

          this.dimControlsListenerAttached[i] = true;
        }
      } else {
        if (this.slicingSpec.viewingDims[0] === i) {
          // This is a dimension being viewed as the vertical (rows) dimension.
          dimControl.textContent =
            `Rows: ${this.slicingSpec.verticalRange[0]}-` +
            `${this.slicingSpec.verticalRange[1]}/${dimSize}`;
        } else {
          // This is a dimension being viewed as the horizontal (columns)
          // dimension.
          dimControl.textContent =
            `Cols: ${this.slicingSpec.horizontalRange[0]}-` +
            `${this.slicingSpec.horizontalRange[1]}/${dimSize}`;
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
   * TODO(cais): Doc string.
   * @param dropdown
   * @param dim
   */
  private renderDropdownMenuItems(
    dropdown: HTMLDivElement,  top: number, left: number, dim: number) {
    // Clear all dropdown menus. Make sure that at any moment, only one dropdown
    // menu is open.
    this.clearAllDropdowns();

    dropdown.style.position = 'fixed';
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.display = 'block';

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.dim);
    for (let i = 0; i < this.rank; ++i) {
      // Create "Swap with" menu items only with slicing dimensions.
      if (slicingDims.indexOf(i) === -1) {
        continue;
      }

      const menuItem = document.createElement('div');
      menuItem.classList.add('tensor-widget-dim-dropdown-menu-item');
      menuItem.textContent = `Swap with dimension ${i}`;
      dropdown.appendChild(menuItem);
      menuItem.addEventListener('mouseenter', () => {
        menuItem.classList.add('tensor-widget-dim-dropdown-menu-item-active');
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.classList.remove('tensor-widget-dim-dropdown-menu-item-active');
      });

      const isFirstViewingDim = this.slicingSpec.viewingDims[0] === dim;
      menuItem.addEventListener('click', () => {
        const k = slicingDims.indexOf(i);
        this.slicingSpec.viewingDims[isFirstViewingDim ? 0 : 1] = i;
        this.slicingSpec.slicingDimsAndIndices[k] = {
          dim,
          index: 0
        };
        this.slicingSpec.verticalRange = null;
        this.slicingSpec.horizontalRange = null;
        if (this.onSlicngSpecChange) {
          this.onSlicngSpecChange(this.slicingSpec);
        }
      });
    }

    dropdown.addEventListener('mouseleave', () => {
      dropdown.style.display = 'none';
    });
  }

  private clearAllDropdowns() {
    this.dropdowns.forEach(dropdown => {
      if (dropdown != null) {
        while (dropdown.firstChild) {
          dropdown.removeChild(dropdown.firstChild);
        }
      }
    });
  }

  setSlicingSpec(slicingSpec: TensorViewSlicingSpec) {
    // TODO(cais): See if there is a change in slicingDimsAndIndices and
    // if there is any change in viewingDims, and if so, call createComponents()
    // before calling render().
    this.slicingSpec = JSON.parse(JSON.stringify(slicingSpec));
    console.log('Calling render:', JSON.stringify(this.slicingSpec));  // DEBUG
    this.render(this.slicingSpec);
  }
}
