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

/** Unit tests for selection. */

import {expect} from 'chai';

import {MoveDirection, Shape, TensorViewSlicingSpec, TensorView} from './types';
import {TensorElementSelection} from './selection';

describe('TensorElementSelection', () => {
  it('Scalar shape', () => {
    const shape: Shape = [];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [],
      verticalRange: null,
      horizontalRange: null,
    };
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      1,
      1
    );
    expect(selection.getElementStatus([])).to.eql({
      topEdge: true,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: true,
    });
  });

  it('1D shape', () => {
    const shape: Shape = [10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0],
      verticalRange: [0, 5],
      horizontalRange: null,
    };
    // Vertical viewing ranges is  unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      5,
      1
    );
    expect(selection.getElementStatus([0])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: true,
    });
    expect(selection.getElementStatus([1])).to.eql({
      topEdge: false,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: true,
    });
    expect(selection.getElementStatus([4])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: true,
    });
    expect(selection.getElementStatus([5])).to.eql(null);
    expect(selection.getElementStatus([9])).to.eql(null);
  });

  it('2D shape: multiple rows and multiple columns', () => {
    const shape = [10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    };
    // Vertical and horizontal viewing ranges are unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      3,
      4
    );
    expect(selection.getElementStatus([0, 0])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: false,
    });
    expect(selection.getElementStatus([0, 1])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: false,
      rightEdge: false,
    });
    expect(selection.getElementStatus([1, 0])).to.eql({
      topEdge: false,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: false,
    });
    expect(selection.getElementStatus([1, 1])).to.eql({
      topEdge: false,
      bottomEdge: false,
      leftEdge: false,
      rightEdge: false,
    });
    expect(selection.getElementStatus([2, 3])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: false,
      rightEdge: true,
    });
    expect(selection.getElementStatus([1, 3])).to.eql({
      topEdge: false,
      bottomEdge: false,
      leftEdge: false,
      rightEdge: true,
    });
    expect(selection.getElementStatus([2, 2])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: false,
      rightEdge: false,
    });
    expect(selection.getElementStatus([3, 4])).to.eql(null);
    expect(selection.getElementStatus([9, 9])).to.eql(null);
  });

  it('2D shape: single row, multiple columns', () => {
    const shape: Shape = [10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    };
    // Vertical and horizontal viewing ranges are unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      1,
      0,
      1,
      4
    );
    expect(selection.getElementStatus([0, 0])).to.eql(null);
    expect(selection.getElementStatus([1, 0])).to.eql({
      topEdge: true,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: false,
    });
    expect(selection.getElementStatus([1, 1])).to.eql({
      topEdge: true,
      bottomEdge: true,
      leftEdge: false,
      rightEdge: false,
    });
    expect(selection.getElementStatus([1, 3])).to.eql({
      topEdge: true,
      bottomEdge: true,
      leftEdge: false,
      rightEdge: true,
    });
    expect(selection.getElementStatus([2, 0])).to.eql(null);
    expect(selection.getElementStatus([2, 1])).to.eql(null);
  });

  it('2D shape: multiple rows, single column', () => {
    const shape: Shape = [10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    };
    // Vertical and horizontal viewing ranges are unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      5,
      7,
      3,
      1
    );
    expect(selection.getElementStatus([0, 0])).to.eql(null);
    expect(selection.getElementStatus([5, 7])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: true,
    });
    expect(selection.getElementStatus([7, 7])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: true,
    });
    expect(selection.getElementStatus([8, 7])).to.eql(null);
  });

  it('2D shape: single row, single column', () => {
    const shape = [10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    };
    // Vertical and horizontal viewing ranges are unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      5,
      7,
      1,
      1
    );
    expect(selection.getElementStatus([0, 0])).to.eql(null);
    expect(selection.getElementStatus([4, 7])).to.eql(null);
    expect(selection.getElementStatus([6, 7])).to.eql(null);
    expect(selection.getElementStatus([5, 6])).to.eql(null);
    expect(selection.getElementStatus([5, 8])).to.eql(null);
    expect(selection.getElementStatus([5, 7])).to.eql({
      topEdge: true,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: true,
    });
  });

  it('3D shape: multiple rows, multiple columns', () => {
    const shape = [4, 10, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 2,
        },
      ],
      viewingDims: [0, 1],
      verticalRange: [0, 5],
      horizontalRange: [0, 5],
    };
    // Vertical and horizontal viewing ranges are unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      5,
      7,
      3,
      2
    );
    expect(selection.getElementStatus([0, 0, 0])).to.eql(null);
    expect(selection.getElementStatus([2, 0, 0])).to.eql(null);
    expect(selection.getElementStatus([3, 5, 7])).to.eql(null);
    expect(selection.getElementStatus([3, 5, 8])).to.eql(null);
    expect(selection.getElementStatus([2, 5, 7])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: true,
      rightEdge: false,
    });
    expect(selection.getElementStatus([2, 5, 8])).to.eql({
      topEdge: true,
      bottomEdge: false,
      leftEdge: false,
      rightEdge: true,
    });
    expect(selection.getElementStatus([2, 7, 7])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: true,
      rightEdge: false,
    });
    expect(selection.getElementStatus([2, 7, 8])).to.eql({
      topEdge: false,
      bottomEdge: true,
      leftEdge: false,
      rightEdge: true,
    });
  });

  it('Zero-sized shape leads to error', () => {
    const shape: Shape = [0, 10];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 0],
      horizontalRange: [0, 5],
    };
    expect(
      () => new TensorElementSelection(shape, slicingSpec, 0, 0, 0, 0)
    ).to.throw(/doesn\'t support tensor with zero elements./);
  });
});

describe('Moving selection', () => {
  it('Scalar moving leads to no-op', () => {
    const shape: Shape = [];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [],
      verticalRange: null,
      horizontalRange: null,
    };
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      1,
      1
    );
    // All movements on a scalar selection leads to no change.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getRowCount()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.getColCount()).to.equal(1);
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getRowCount()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.getColCount()).to.equal(1);
    expect(selection.move(MoveDirection.LEFT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getRowCount()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.getColCount()).to.equal(1);
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getRowCount()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.getColCount()).to.equal(1);
  });

  it('1D moving', () => {
    const shape: Shape = [6];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0],
      verticalRange: [0, 5],
      horizontalRange: null,
    };
    // Vertical viewing ranges is  unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      5,
      1
    );
    // Null effects from left-right movements.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.move(MoveDirection.LEFT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    // Effective movements without changing slicing spec.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(2);
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(3);
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(4);
    // Movement causes updates to slicing spec.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.equal(
      MoveDirection.DOWN
    );
    expect(selection.getRowStart()).to.equal(5);

    // Cannnot move anymore.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(5);
  });

  it('2D moving', () => {
    const shape: Shape = [3, 3];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 2],
      horizontalRange: [0, 2],
    };
    // Vertical viewing ranges is  unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      1,
      1
    );
    // Null effects from up and left movements.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.move(MoveDirection.LEFT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    // Non-null effect from down movement.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    // Non-null effect from right movement.
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(1);
    // Next down movement should cause a slicinng spec change.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.equal(
      MoveDirection.DOWN
    );
    expect(selection.getRowStart()).to.equal(2);
    expect(selection.getColStart()).to.equal(1);
    // Next right movement should cause a slicing spec change.
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.equal(
      MoveDirection.RIGHT
    );
    expect(selection.getRowStart()).to.equal(2);
    expect(selection.getColStart()).to.equal(2);
    // Moving back up.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(2);
  });

  it('2D moving with setSlicingSpec reflects new spec', () => {
    const shape: Shape = [3, 3];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [0, 2],
      horizontalRange: [0, 2],
    };
    // Vertical viewing ranges is  unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      1,
      1,
      1,
      1
    );

    const newSlicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [],
      viewingDims: [0, 1],
      verticalRange: [1, 3],
      horizontalRange: [1, 3],
    };
    // With the new slicing spec set, the downward move should lead to no update
    // in the slicing spec, and neither should the rightward move.
    expect(selection.move(MoveDirection.DOWN, newSlicingSpec)).to.be.null;
    expect(selection.move(MoveDirection.RIGHT, newSlicingSpec)).to.be.null;
  });

  it('3D moving', () => {
    const shape: Shape = [2, 3, 3];
    const slicingSpec: TensorViewSlicingSpec = {
      slicingDimsAndIndices: [
        {
          dim: 0,
          index: 1,
        },
      ],
      viewingDims: [1, 2],
      verticalRange: [0, 2],
      horizontalRange: [0, 2],
    };
    // Vertical viewing ranges is  unimportant for selection
    // calculation, but are included for completeness.
    const selection = new TensorElementSelection(
      shape,
      slicingSpec,
      0,
      0,
      1,
      1
    );
    // Null effects from up and left movements.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    expect(selection.move(MoveDirection.LEFT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(0);
    expect(selection.getColStart()).to.equal(0);
    // Non-null effect from down movement.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(0);
    // Non-null effect from right movement.
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(1);
    // Next down movement should cause a slicinng spec change.
    expect(selection.move(MoveDirection.DOWN, slicingSpec)).to.equal(
      MoveDirection.DOWN
    );
    expect(selection.getRowStart()).to.equal(2);
    expect(selection.getColStart()).to.equal(1);
    // Next right movement should cause a slicing spec change.
    expect(selection.move(MoveDirection.RIGHT, slicingSpec)).to.equal(
      MoveDirection.RIGHT
    );
    expect(selection.getRowStart()).to.equal(2);
    expect(selection.getColStart()).to.equal(2);

    // Moving back up.
    expect(selection.move(MoveDirection.UP, slicingSpec)).to.be.null;
    expect(selection.getRowStart()).to.equal(1);
    expect(selection.getColStart()).to.equal(2);
  });
});
