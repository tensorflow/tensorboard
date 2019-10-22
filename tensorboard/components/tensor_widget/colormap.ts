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

/** Configuration for a colormap. */
export interface ColorMapConfig {
  /**
   * Minimum value that the color map can map to without clipping.
   * Must be a finite value.
   */
  min: number;

  /**
   * Minimum value that the color map can map to without clipping.
   * Must be a finite value and be `>= min`.
   *
   * In the case of `max === min`, all finite values mapped to the
   * midpoint of the color scale.
   */
  max: number;
}

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
  constructor(protected config: ColorMapConfig) {
    if (!isFinite(config.min)) {
      throw new Error(`min value (${config.min}) is not finite`);
    }
    if (!isFinite(config.max)) {
      throw new Error(`max value (${config.max}) is not finite`);
    }
    if (config.max < config.min) {
      throw new Error(`max (${config.max}) is < min (${config.min})`);
    }
  }

  /**
   * Get the RGB value based on element value.
   * @param value The element value to be mapped to RGB color value.
   * @returns RGB color value represented as a length-3 number array.
   *   The range of RGB values is [0, 255].
   */
  abstract getRGB(value: number): [number, number, number];

  /**
   * Render the colormap as a horizontal scale, while highlighting a specifc
   * value.
   *
   * The value is highlighted if and only if it is `>= this.config.min` and
   * `<= this.config.max`.
   *
   * @param canvas The canvas on which
   * @param value The number to highlight (optional).
   */
  render(canvas: HTMLCanvasElement, value?: number) {
    if (this.config.min === this.config.max) {
      return;
    }
    const context = canvas.getContext('2d');
    if (context == null) {
      return;
    }
    const steps = 100;
    const cellWidth = canvas.width / steps;
    const height = canvas.height;
    const verticalMargin = 0.2;
    const barHeight = height * (1 - 2 * verticalMargin);
    for (let i = 0; i < steps; ++i) {
      const value =
        (this.config.max - this.config.min) * (i / steps) + this.config.min;
      const x = cellWidth * i;
      const y = height * verticalMargin;
      const [r, g, b] = this.getRGB(value);
      context.beginPath();
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
      context.fillRect(x, y, cellWidth, barHeight);
      context.stroke();
    }

    if (value != null) {
      const tickWidth = 8;
      if (value >= this.config.min && value <= this.config.max) {
        // Highlight the relative position of `value` along the color scale.
        const tickX =
          ((value - this.config.min) / (this.config.max - this.config.min)) *
          canvas.width;

        // Draw the triangle on the top.
        context.beginPath();
        context.fillStyle = 'rgba(0, 0, 0, 1)';
        context.moveTo(tickX, verticalMargin * height);
        context.lineTo(tickX - tickWidth / 2, 0);
        context.lineTo(tickX + tickWidth / 2, 0);
        context.fill();

        // Draw the triangle on the bottom.
        context.beginPath();
        context.moveTo(tickX, (1 - verticalMargin) * height);
        context.lineTo(tickX - tickWidth / 2, height);
        context.lineTo(tickX + tickWidth / 2, height);
        context.fill();
      }
    }
  }
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
    let relValue =
      this.config.min === this.config.max
        ? 0.5
        : (value - this.config.min) / (this.config.max - this.config.min);
    relValue = Math.max(Math.min(relValue, 1), 0);
    return [MAX_RGB * relValue, MAX_RGB * relValue, MAX_RGB * relValue];
  }
}

export class JetColorMap extends ColorMap {
  getRGB(value: number): [number, number, number] {
    if (isNaN(value)) {
      // NaN.
      return [MAX_RGB * 0.25, MAX_RGB * 0.25, MAX_RGB * 0.25];
    } else if (!isFinite(value)) {
      if (value < 0) {
        // -Infinity.
        return [MAX_RGB * 0.5, MAX_RGB * 0.5, MAX_RGB * 0.5];
      } else {
        // +Infinity.
        return [MAX_RGB * 0.75, MAX_RGB * 0.75, MAX_RGB * 0.75];
      }
    }

    let relR = 0;
    let relG = 0;
    let relB = 0;
    const lim0 = 0.35;
    const lim1 = 0.65;

    let relValue =
      this.config.min === this.config.max
        ? 0.5
        : (value - this.config.min) / (this.config.max - this.config.min);
    relValue = Math.max(Math.min(relValue, 1), 0);
    if (relValue <= lim0) {
      relG = relValue / lim0;
      relB = 1;
    } else if (relValue > lim0 && relValue <= lim1) {
      relR = (relValue - lim0) / (lim1 - lim0);
      relG = 1;
      relB = (lim1 - relValue) / (lim1 - lim0);
    } else if (relValue > lim1) {
      relR = 1;
      relG = (1 - relValue) / (1 - lim1);
    }
    return [relR * MAX_RGB, relG * MAX_RGB, relB * MAX_RGB];
  }
}
