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

// ---- Inline OKLCH color computation (must match webapp/util/oklch_colors.ts) -

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashToHue(hash: number): number {
  return (hash / 0x100000000) * 360;
}

function oklchToHex(L: number, C: number, H: number): string {
  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.291485548 * labB;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const linR = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toSrgb = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const r = Math.round(clamp(toSrgb(linR)) * 255);
  const g = Math.round(clamp(toSrgb(linG)) * 255);
  const b = Math.round(clamp(toSrgb(linB)) * 255);
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}

const LIGHTNESS = 0.65;
const CHROMA = 0.155;

function hashColorForRun(runName: string): string {
  const scopedKey = 'run|' + runName;
  const colorId = fnv1a32(scopedKey);
  return oklchToHex(LIGHTNESS, CHROMA, hashToHue(colorId));
}

// ---- Read overrides from _tb_run_colors.v1 ----------------------------------

const RUN_COLORS_KEY = '_tb_run_colors.v1';

function stripExpPrefix(runId: string): string {
  const i = runId.indexOf('/');
  return i >= 0 ? runId.substring(i + 1) : runId;
}

/**
 * Read _tb_run_colors.v1 and build a bare-run-name → hex-color map.
 * Priority: explicit override > groupKeyToColorId hash > null.
 */
function readStoredColors(): Record<string, string> {
  const raw = window.localStorage.getItem(RUN_COLORS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      runColorOverrides?: Array<[string, string]>;
      groupKeyToColorId?: Array<[string, number]>;
    };
    if (parsed.version !== 1) return {};
    const out: Record<string, string> = {};
    // Default colors from the stored groupKey → colorId map.
    if (Array.isArray(parsed.groupKeyToColorId)) {
      for (const [groupKey, colorId] of parsed.groupKeyToColorId) {
        if (!groupKey.startsWith('run|')) continue;
        const runId = groupKey.substring(4); // strip "run|"
        const name = stripExpPrefix(runId);
        if (colorId > 6) {
          out[name] = oklchToHex(LIGHTNESS, CHROMA, hashToHue(colorId));
        }
      }
    }
    // Explicit overrides win.
    if (Array.isArray(parsed.runColorOverrides)) {
      for (const [runId, color] of parsed.runColorOverrides) {
        out[stripExpPrefix(runId)] = color;
      }
    }
    return out;
  } catch {
    return {};
  }
}

// ---- ColorScale -------------------------------------------------------------

export class ColorScale {
  private identifiers = d3.map();
  constructor(private readonly palette: string[] = standard) {}

  public setDomain(strings: string[]): this {
    const stored = readStoredColors();
    this.identifiers = d3.map();
    for (const s of strings) {
      this.identifiers.set(s, stored[s] ?? hashColorForRun(s));
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

// ---- Auto-updating color scales ---------------------------------------------

function createAutoUpdateColorScale(
  store: BaseStore,
  getDomain: () => string[]
): (runName: string) => string {
  const colorScale = new ColorScale();
  function update(): void {
    colorScale.setDomain(getDomain());
  }
  store.addListener(update);
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
