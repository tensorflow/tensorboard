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
  private dimGroup: HTMLDivElement;

  /**
   *
   * @param rootDiv
   * @param shape Shape of the tensor.
   * @param initialSlicingSpec The initial slicing spec of the dimension.
   *   DimensionControl will not mutate this object.
   */
  constructor(private readonly rootDiv: HTMLDivElement,
              private readonly shape: Shape,
              readonly initialSlicingSpec: TensorViewSlicingSpec,
              private readonly onSlcingSpecChange: OnSlicingSpecChangeCallback) {
    this.rank = this.shape.length;
    if (this.rank < 3) {
      throw new Error(
          `Dimension control is not applicable to tensor shapes less than ` +
          `3D: received ${this.rank}D tensor shape: ` +
          `${JSON.stringify(this.shape)}.`);
    }
    this.rootDiv.classList.add('tensor-widget-slicing-control');
    this.slicingSpec = JSON.parse(JSON.stringify(initialSlicingSpec));
  }

  render() {
    if (this.dimGroup == null) {
      this.dimGroup = document.createElement('div');
      this.dimGroup.classList.add('tensor-widget-dim-group');
      this.rootDiv.appendChild(this.dimGroup);
    }

    // Clean the dim group.
    while (this.dimGroup.firstChild) {
      this.dimGroup.removeChild(this.dimGroup.firstChild);
    }

    const slicingDims = this.slicingSpec.slicingDimsAndIndices.map(
      dimAndIndex => dimAndIndex.dim);
    const slicingIndices = this.slicingSpec.slicingDimsAndIndices.map(
        dimAndIndex => dimAndIndex.index);
    for (let i = 0; i < this.rank; ++i) {
      const dimControl = document.createElement('div');
      if (slicingDims.indexOf(i) !== -1) {
        // This is a dimension being sliced down to a size of 1.
      } else if (this.slicingSpec.viewingDims[0] === i) {
        // This is a dimension being viewed as the vertical (rows) dimension.
        dimControl.textContent = '↕:';
        dimControl.classList.add('tensor-widget-dim-viewed');
      } else if (this.slicingSpec.viewingDims[1] === i) {
        // This is a dimension being viewed as the horizontal (columns)
        // dimension.
        dimControl.textContent = '↔:';
        dimControl.classList.add('tensor-widget-dim-viewed');
      }
    }
  }
}
