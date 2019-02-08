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
namespace vz_projector.umap.utils {

function generateGaussian(mean: number, std: number) {
  const u1 = tauRand();
  const u2 = tauRand();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);

  return z0 * std + mean;
}

export function randomNormal2d(mean = 0, stdev = 1, size: number[] = [1, 1]) {
  return Array(size[0])
    .fill(0)
    .map(() => {
      return Array(size[1])
        .fill(0)
        .map(() => generateGaussian(mean, stdev));
    });
}

const MAX_INT = 0x7fffffff * 2;
export function tauRandInt(n = MAX_INT) {
  return Math.floor(Math.random() * n);
}

export function tauRand() {
  return tauRandInt() / MAX_INT;
}

/**
 * Compute the (standard l2) norm of a vector.
 */
export function norm(vec: number[]) {
  let result = 0;
  for (let item of vec) {
    result += item ** 2;
  }
  return Math.sqrt(result);
}

export function empty(n: number): undefined[] {
  return [...new Array(n)];
}

export function filled(n: number, v: number): number[] {
  return empty(n).map(() => v);
}

export function range(n: number): number[] {
  return empty(n).map((_, i) => i);
}

export function zeros(n: number): number[] {
  return filled(n, 0);
}

export function ones(n: number): number[] {
  return filled(n, 1);
}

export function sum(input: number[]): number {
  return input.reduce((sum, val) => sum + val);
}

export function mean(input: number[]): number {
  return sum(input) / input.length;
}

export function max(input: number[]): number {
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    max = input[i] > max ? input[i] : max;
  }
  return max;
}

export function max2d(input: number[][]): number {
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    for (let j = 0; j < input[i].length; j++) {
      max = input[i][j] > max ? input[i][j] : max;
    }
  }
  return max;
}

}  // namespace vz_projector.umap.utils