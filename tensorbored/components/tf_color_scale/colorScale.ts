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

/**
 * Read the run-name → hex-color map seeded on window by the NgRx
 * RunsEffects syncPolymerRunColorMap$ effect. Returns null before the
 * effect has fired for the first time.
 */
function readColorMap(): Record<string, string> | null {
  return ((window as any).__tbRunColorMap as Record<string, string>) ?? null;
}

export class ColorScale {
  private identifiers = d3.map();

  constructor(private readonly palette: string[] = standard) {}

  public setDomain(strings: string[]): this {
    this.identifiers = d3.map();
    if (strings.length === 0) {
      return this;
    }
    const stored = readColorMap();
    if (stored) {
      strings.forEach((s, i) => {
        const color = stored[s];
        if (color !== undefined) {
          this.identifiers.set(s, color);
        } else {
          console.error(
            `ColorScale: run "${s}" missing from shared color map`
          );
          this.identifiers.set(s, this.palette[i % this.palette.length]);
        }
      });
    } else {
      // NgRx bridge has not seeded window.__tbRunColorMap yet.
      // Fall back to the static palette so getColor never fails for
      // runs that were passed to setDomain.
      strings.forEach((s, i) => {
        this.identifiers.set(s, this.palette[i % this.palette.length]);
      });
    }
    return this;
  }

  public getColor(s: string): string {
    if (!this.identifiers.has(s)) {
      throw new Error(`String ${s} was not in the domain.`);
    }
    return this.identifiers.get(s) as string;
  }
}

function createAutoUpdateColorScale(
  store: BaseStore,
  getDomain: () => string[]
): (runName: string) => string {
  const colorScale = new ColorScale();
  function update(): void {
    colorScale.setDomain(getDomain());
  }
  store.addListener(update);
  // Re-read colors when the NgRx store subscription updates them.
  window.addEventListener('tb-run-color-map-changed', update);
  update();
  return (runName) => colorScale.getColor(runName);
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
