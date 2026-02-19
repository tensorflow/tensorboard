/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
import * as d3 from 'd3';
import {BaseStore} from '../tf_backend/baseStore';
import {experimentsStore} from '../tf_backend/experimentsStore';
import {runsStore} from '../tf_backend/runsStore';
import {standard} from './palettes';

const POLYMER_RUN_COLOR_MAP_KEY = '_tb_run_color_map';

function readColorMapFromLocalStorage(): Record<string, string> {
  const raw = window.localStorage.getItem(POLYMER_RUN_COLOR_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// Example usage:
// runs = ["train", "test", "test1", "test2"]
// ccs = new ColorScale();
// ccs.domain(runs);
// ccs.getColor("train");
// ccs.getColor("test1");
export class ColorScale {
  private identifiers = d3.map();
  /**
   * Creates a color scale with optional custom palette.
   * @param {Array<string>} palette The color palette to use, as an
   *   Array of hex strings. Defaults to the standard palette.
   */
  constructor(private readonly palette: string[] = standard) {}
  /**
   * Set the domain of strings.  Colours are pulled from the time-series
   * dashboard's colour map in localStorage first; the fixed palette is
   * only used as a fallback for runs that don't appear there yet.
   * @param {Array<string>} strings - An array of possible strings to use as the
   *     domain for your scale.
   */
  public setDomain(strings: string[]): this {
    const storedColors = readColorMapFromLocalStorage();
    this.identifiers = d3.map();
    strings.forEach((s, i) => {
      this.identifiers.set(
        s,
        storedColors[s] ?? this.palette[i % this.palette.length]
      );
    });
    return this;
  }
  /**
   * Use the color scale to transform an element in the domain into a color.
   * @param {string} The input string to map to a color.
   * @return {string} The color corresponding to that input string.
   * @throws Will error if input string is not in the scale's domain.
   */
  public getColor(s: string): string {
    if (!this.identifiers.has(s)) {
      throw new Error(`String ${s} was not in the domain.`);
    }
    return this.identifiers.get(s) as string;
  }
}

/**
 * A color scale of a domain from a store. Automatically updated when the store
 * emits a change.
 */
function createAutoUpdateColorScale(
  store: BaseStore,
  getDomain: () => string[]
): (runName: string) => string {
  const colorScale = new ColorScale();
  function update(): void {
    colorScale.setDomain(getDomain());
  }
  store.addListener(update);
  // Re-read when the NgRx effects write a new color map (same tab).
  window.addEventListener('tb-run-color-map-changed', update);
  // Re-read when another browser tab writes to localStorage.
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === POLYMER_RUN_COLOR_MAP_KEY) update();
  });
  update();
  return (domain) => colorScale.getColor(domain);
}

export const runsColorScale = createAutoUpdateColorScale(runsStore, () =>
  runsStore.getRuns()
);

export const experimentsColorScale = createAutoUpdateColorScale(
  experimentsStore,
  () => {
    return experimentsStore.getExperiments().map(({name}) => name);
  }
);
