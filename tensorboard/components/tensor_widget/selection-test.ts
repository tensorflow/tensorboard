/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/** Unit tests for selection. */

import {expect} from 'chai';

import {TensorViewSlicingSpec} from './types';
import {TensorElementSelection, CellSelectionStatus} from './selection';

describe('TensorElementSelection', () => {
  it('Scalar shape', () => {
    const shape = [];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [],
      verticalRange: null,
      horizontalRange: null
    }
    const selection = new TensorElementSelection(shape, slicingSpec, 0, 0, 1, 1);
    expect(selection.getElementStatus([])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.TOP_EDGE,
      CellSelectionStatus.BOTTOM_EDGE,
      CellSelectionStatus.LEFT_EDGE, CellSelectionStatus.RIGHT_EDGE]);
  });

  it('1D shape', () => {
    const shape = [10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0],
      verticalRange: [0, 5],
    }
    const selection = new TensorElementSelection(shape, slicingSpec, 0, 0, 5, 1);
    expect(selection.getElementStatus([0])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.TOP_EDGE,
      CellSelectionStatus.LEFT_EDGE, CellSelectionStatus.RIGHT_EDGE]);
    expect(selection.getElementStatus([1])).to.eql([
      CellSelectionStatus.SELECTED,
      CellSelectionStatus.LEFT_EDGE, CellSelectionStatus.RIGHT_EDGE]);
    expect(selection.getElementStatus([4])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.BOTTOM_EDGE,
      CellSelectionStatus.LEFT_EDGE, CellSelectionStatus.RIGHT_EDGE]);
    expect(selection.getElementStatus([5])).to.eql(null);
    expect(selection.getElementStatus([9])).to.eql(null);
  });

  it('2D shape', () => {
    const shape = [10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    }
    const selection = new TensorElementSelection(shape, slicingSpec, 0, 0, 3, 4);
    expect(selection.getElementStatus([0, 0])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.TOP_EDGE,
      CellSelectionStatus.LEFT_EDGE]);
    expect(selection.getElementStatus([0, 1])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.TOP_EDGE]);
    expect(selection.getElementStatus([1, 0])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.LEFT_EDGE]);
    expect(selection.getElementStatus([1, 1])).to.eql([
      CellSelectionStatus.SELECTED]);
    expect(selection.getElementStatus([2, 3])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.BOTTOM_EDGE,
      CellSelectionStatus.RIGHT_EDGE]);
    expect(selection.getElementStatus([1, 3])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.RIGHT_EDGE]);
    expect(selection.getElementStatus([2, 2])).to.eql([
      CellSelectionStatus.SELECTED, CellSelectionStatus.BOTTOM_EDGE]);
    expect(selection.getElementStatus([3, 4])).to.eql(null);
    expect(selection.getElementStatus([9, 9])).to.eql(null);
  });
});
