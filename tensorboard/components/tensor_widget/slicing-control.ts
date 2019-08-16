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

  /**
   *
   * @param rootDiv
   * @param shape Shape of the tensor.
   * @param initialSlicingSpec The initial slicing spec of the dimension.
   *   DimensionControl will not mutate this object.
   */
  constructor(private readonly rootDiv: HTMLDivElement,
              private readonly shape: Shape,
              private readonly onSlcingSpecChange: OnSlicingSpecChangeCallback) {
    this.rank = this.shape.length;
    if (this.rank < 3) {
      throw new Error(
          `Dimension control is not applicable to tensor shapes less than ` +
          `3D: received ${this.rank}D tensor shape: ` +
          `${JSON.stringify(this.shape)}.`);
    }
  }

  render(slcingSpec: TensorViewSlicingSpec) {
    this.slicingSpec = JSON.parse(JSON.stringify(slcingSpec));
    // if (this.rootDiv == null) {
    //   this.rootDiv.appendChild(this.rootDiv);
    // }

    // Clean the dim group.
    while (this.rootDiv.firstChild) {
      this.rootDiv.removeChild(this.rootDiv.firstChild);
    }
    this.dimControls = [];

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.dim);
    const slicingIndices = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.index);
    for (let i = 0; i < this.rank; ++i) {
      const dimControl = document.createElement('div');
      if (slicingDims.indexOf(i) !== -1) {
        // This is a dimension being sliced down to a size of 1.
        const dimSize = this.shape[i];
        const currentIndex = slicingIndices[slicingDims.indexOf(i)];
        dimControl.textContent = `${currentIndex}/${dimSize}`;
        dimControl.classList.add('tensor-widget-dim');

        const dimInput = document.createElement('input');
        dimInput.classList.add('tensor-widget-dim');
        dimInput.type = 'number';
        dimInput.min = '0';
        dimInput.max = `${dimSize - 1}`;
        dimInput.value = `${currentIndex}`;
        dimInput.style.width = '5';
        dimInput.style.display = 'none';
        this.rootDiv.appendChild(dimInput);

        // When the dim control is clicked, it becomes a number input.
        dimControl.addEventListener('click', () => {
          dimControl.style.display = 'none';
          dimInput.style.display = 'inline-block' ;
        });

        // Set change callback for the dim input.
        dimInput.addEventListener('change',  () => {
          const newIndex = parseInt(dimInput.value, 10);
          if (newIndex < 0 || newIndex >= dimSize || Math.floor(dimSize) != dimSize) {
            // Reject invalid value.
            dimInput.value =
              `${this.slicingSpec.slicingDimsAndIndices[slicingDims.indexOf(i)].index}`;
            return;
          }
          this.slicingSpec.slicingDimsAndIndices[slicingDims.indexOf(i)].index =
            newIndex;
          dimControl.textContent = `${newIndex}/${dimSize}`;
          this.onSlcingSpecChange(this.slicingSpec);
        });

        // When defocusing (blurring) from the dim input, it changes back into
        // a div.
        dimInput.addEventListener('blur', () => {
          dimInput.style.display = 'none';
          dimControl.style.display = 'inline-block';
          // TODO(cais): Update the number.
          // this.drawDimControl('top');
          // this.drawDimControl('left');
        });

      } else if (this.slicingSpec.viewingDims[0] === i) {
        // This is a dimension being viewed as the vertical (rows) dimension.
        dimControl.textContent = '↕:';
        dimControl.classList.add('tensor-widget-dim');
      } else if (this.slicingSpec.viewingDims[1] === i) {
        // This is a dimension being viewed as the horizontal (columns)
        // dimension.
        dimControl.textContent = '↔:';
        dimControl.classList.add('tensor-widget-dim');
      }
      this.rootDiv.appendChild(dimControl);
      this.dimControls.push(dimControl);
    }
  }
}
