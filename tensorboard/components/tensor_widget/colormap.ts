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

/** Colormap used to display numeric values */

const MAX_RGB = 255;

/**
 * Abstract base class for colormap.
 *
 * A colormap maps a numeric value to an RGB color.
 */
export abstract class ColorMap {
  /**
   * Constructor of ColorMap.
   * @param min Minimum. Must be a finite value.
   * @param max Maximum. Must be finite and >= `min`.
   */
  constructor(protected readonly min: number, protected readonly max: number) {
    if (!isFinite(min)) {
      throw new Error(`min value (${min}) is not finite`);
    }
    if (!isFinite(max)) {
      throw new Error(`max value (${max}) is not finite`);
    }
    if (max < min) {
      throw new Error(`max (${max}) is < min (${min})`);
    }
  }

  /**
   * Get the RGB value based on element value.
   * @param value The element value to be mapped to RGB color value.
   * @returns RGB color value represented as a length-3 number array.
   *   The range of RGB values is [0, 255].
   */
  abstract getRGB(value: number): [number, number, number];
}

/**
 * A grayscale color map implementation.
 */
export class GrayscaleColorMap extends ColorMap {
  getRGB(value: number): [number, number, number] {
    // This color scheme for pathological values matches tfdbg v1's Health Pills
    // feature.
    if (isNaN(value)) {
      // NaN.
      return [MAX_RGB, 0, 0];
    } else if (!isFinite(value)) {
      if (value > 0) {
        // +Infinity.
        return [0, 0, MAX_RGB];
      } else {
        // -Infinity.
        return [MAX_RGB, MAX_RGB / 2, 0];
      }
    }
    let relativeValue =
      this.min === this.max ? 0.5 : (value - this.min) / (this.max - this.min);
    relativeValue = Math.max(Math.min(relativeValue, 1), 0);
    return [
      MAX_RGB * relativeValue,
      MAX_RGB * relativeValue,
      MAX_RGB * relativeValue,
    ];
  }
}
