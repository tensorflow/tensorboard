/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {HistogramMode} from '../widgets/histogram/histogram_types';
import {LinkedTime} from '../widgets/linked_time_fob/linked_time_types';

export {HistogramMode, LinkedTime};

export enum PluginType {
  SCALARS = 'scalars',
  HISTOGRAMS = 'histograms',
  IMAGES = 'images',
}

// When adding a new value to the enum, please implement the deserializer on
// data_source/metrics_data_source.ts.
// When editing a value of the enum, please write a backward compatible
// deserializer in data_source/metrics_data_source.ts.
export enum TooltipSort {
  DEFAULT = 'default',
  ALPHABETICAL = 'alphabetical',
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
  NEAREST = 'nearest',
}

export enum XAxisType {
  STEP,
  RELATIVE,
  WALL_TIME,
}

export interface CardMetadata {
  plugin: PluginType;
  tag: string;
  sample?: number;
  numSample?: number;

  /**
   * A `null` runId indicates all runs.
   */
  runId: string | null;
}

/**
 * Identifier for a card which, itself, is not a pinned copy of another card.
 * Views may treat a non-pinned card as having "truthy pin state" if another
 * `PinnedCardId` is associated to it.
 */
export type NonPinnedCardId = string;

export type PinnedCardId = string;

/**
 * A unique identifier to a specific card instance in the UI. This is an opaque
 * ID, meaning that consumers should never peer into/parse it and never assume
 * that it will always be a string.
 */
export type CardId = NonPinnedCardId | PinnedCardId;

export type CardIdWithMetadata = CardMetadata & {
  cardId: CardId;
};

export interface CardGroup {
  groupName: string;
  items: CardIdWithMetadata[];
}

/**
 * The most minimal representation of a card that uniquely identifies it across
 * a browser session. This information may be persisted in storage, retrieved,
 * and used to match against an existing card with the same metadata.
 */
export interface CardUniqueInfo {
  plugin: string;
  tag: string;
  runId?: string;
  sample?: number;
}

/**
 * The metrics-related state created by deserializing a URL.
 */
export interface URLDeserializedState {
  metrics: {
    pinnedCards: CardUniqueInfo[];
    smoothing: number | null;
    tagFilter: string | null;
  };
}

export const SCALARS_SMOOTHING_MIN = 0;
export const SCALARS_SMOOTHING_MAX = 0.999;
