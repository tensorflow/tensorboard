/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_projector.umap.matrix {

/**
 * Internal 2-dimensional sparse matrix class
 */
export class SparseMatrix {
  rows: number[];
  cols: number[];
  values: number[];

  entries = new Map<string, number>();

  nRows: number = 0;
  nCols: number = 0;

  constructor(
    rows: number[],
    cols: number[],
    values: number[],
    dims: number[]
  ) {
    // TODO: Assert that rows / cols / vals are the same length.
    this.rows = [...rows];
    this.cols = [...cols];
    this.values = [...values];

    for (let i = 0; i < values.length; i++) {
      const key = this.makeKey(this.rows[i], this.cols[i]);
      this.entries.set(key, i);
    }

    // TODO: Assert that dims are legit.
    this.nRows = dims[0];
    this.nCols = dims[0];
  }

  private makeKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private fromKey(key: string): number[] {
    const pieces = key.split(':');
    return [parseInt(pieces[0]), parseInt(pieces[1])];
  }

  private checkDims(row: number, col: number) {
    const withinBounds = row < this.nRows && col < this.nCols;
    // TODO: Assert that dims are legit.
  }

  set(row: number, col: number, value: number) {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (!this.entries.has(key)) {
      this.rows.push(row);
      this.cols.push(col);
      this.values.push(value);
      this.entries.set(key, this.values.length - 1);
    }
  }

  get(row: number, col: number, defaultValue = 0) {
    this.checkDims(row, col);
    const key = this.makeKey(row, col);
    if (this.entries.has(key)) {
      const index = this.entries.get(key);
      return this.values[index];
    } else {
      return defaultValue;
    }
  }

  getValues(): number[] {
    return [...this.values];
  }

  forEach(fn: (value: number, row: number, col: number) => void): void {
    for (let i = 0; i < this.values.length; i++) {
      fn(this.values[i], this.rows[i], this.cols[i]);
    }
  }

  map(fn: (value: number, row: number, col: number) => number): SparseMatrix {
    let vals = [];
    for (let i = 0; i < this.values.length; i++) {
      vals.push(fn(this.values[i], this.rows[i], this.cols[i]));
    }
    const dims = [this.nRows, this.nCols];
    return new SparseMatrix(this.rows, this.cols, vals, dims);
  }

  toArray() {
    const rows: number[][] = [...new Array(this.nRows)];
    const output = rows.map(() => {
      const cols = [...new Array(this.nCols)];
      return cols.map(() => 0);
    });
    for (let i = 0; i < this.values.length; i++) {
      output[this.rows[i]][this.cols[i]] = this.values[i];
    }
    return output;
  }
}

export function transpose(matrix: SparseMatrix): SparseMatrix {
  const cols: number[] = [];
  const rows: number[] = [];
  const vals: number[] = [];

  matrix.forEach((value, row, col) => {
    cols.push(row);
    rows.push(col);
    vals.push(value);
  });

  const dims = [matrix.nCols, matrix.nRows];
  return new SparseMatrix(rows, cols, vals, dims);
}

/**
 * Construct a sparse identity matrix
 */
export function identity(size: number[]): SparseMatrix {
  const [rows] = size;
  const matrix = new SparseMatrix([], [], [], size);
  for (let i = 0; i < rows; i++) {
    matrix.set(i, i, 1);
  }
  return matrix;
}

export function elementWise(
  a: SparseMatrix,
  b: SparseMatrix,
  op: (x: number, y: number) => number
): SparseMatrix {
  const visited = new Set<string>();
  const rows: number[] = [];
  const cols: number[] = [];
  const vals: number[] = [];

  const operate = (row: number, col: number) => {
    rows.push(row);
    cols.push(col);
    const nextValue = op(a.get(row, col), b.get(row, col));
    vals.push(nextValue);
  };

  for (let i = 0; i < a.values.length; i++) {
    const row = a.rows[i];
    const col = a.cols[i];
    const key = `${row}:${col}`;
    visited.add(key);
    operate(row, col);
  }

  for (let i = 0; i < b.values.length; i++) {
    const row = b.rows[i];
    const col = b.cols[i];
    const key = `${row}:${col}`;
    if (visited.has(key)) continue;
    operate(row, col);
  }

  const dims = [a.nRows, a.nCols];
  return new SparseMatrix(rows, cols, vals, dims);
}

export function dotMultiply(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x * y);
}

export function add(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x + y);
}

export function subtract(a: SparseMatrix, b: SparseMatrix): SparseMatrix {
  return elementWise(a, b, (x, y) => x - y);
}

export function multiplyScalar(a: SparseMatrix, scalar: number): SparseMatrix {
  return a.map((value: number) => {
    return value * scalar;
  });
}


}  // namespace vz_projector.umap.matrix