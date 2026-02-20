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

/**
 * Read the run-name → hex-color map.  Primary source is the in-memory
 * map on `window.__tbRunColorMap` (set by a live NgRx store
 * subscription, always up-to-date).  Falls back to localStorage for
 * the first render before the NgRx subscription has fired.
 */
function readColorMap(): Record<string, string> {
  const live = (window as any).__tbRunColorMap as
    | Record<string, string>
    | undefined;
  if (live && Object.keys(live).length > 0) return live;
  const raw = window.localStorage.getItem(POLYMER_RUN_COLOR_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export class ColorScale {
  private identifiers = d3.map();
  constructor(private readonly palette: string[] = standard) {}

  public setDomain(strings: string[]): this {
    const stored = readColorMap();
    this.identifiers = d3.map();
    strings.forEach((s, i) => {
      this.identifiers.set(
        s,
        stored[s] ?? this.palette[i % this.palette.length]
      );
    });
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
