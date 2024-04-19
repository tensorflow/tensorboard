/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

import {TooltipSort} from '../../metrics/types';
import {ColumnHeader} from '../../widgets/data_table/types';

export enum ThemeValue {
  BROWSER_DEFAULT = 'browser_default',
  LIGHT = 'light',
  DARK = 'dark',
}

/**
 * Global settings that the backend remembers. `declare`d so properties do not
 * get mangled or mangled differently when a version compiler changes.
 *
 * For example, ClosureCompiler can mangle property names to make the payload
 * smaller and so can `terser` (with config).
 */
export declare interface BackendSettings {
  scalarSmoothing?: number;
  tooltipSort?: TooltipSort;
  ignoreOutliers?: boolean;
  autoReload?: boolean;
  autoReloadPeriodInMs?: number;
  paginationSize?: number;
  theme?: ThemeValue;
  notificationLastReadTimeInMs?: number;
  sideBarWidthInPercent?: number;
  timeSeriesSettingsPaneOpened?: boolean;
  timeSeriesCardMinWidth?: number | null;
  stepSelectorEnabled?: boolean;
  rangeSelectionEnabled?: boolean;
  linkedTimeEnabled?: boolean;
  singleSelectionHeaders?: ColumnHeader[];
  rangeSelectionHeaders?: ColumnHeader[];
  dashboardDisplayedHparamColumns?: ColumnHeader[];
  savingPinsEnabled?: boolean;
}

/**
 * Internal representation of persistable settings. Unlike BackendSettings, this
 * interface is not `declare`d, meaning the property names can be mangled and
 * user should not use string literals to access its property value.
 */
export interface PersistableSettings {
  scalarSmoothing?: number;
  tooltipSort?: TooltipSort;
  ignoreOutliers?: boolean;
  autoReload?: boolean;
  autoReloadPeriodInMs?: number;
  pageSize?: number;
  themeOverride?: ThemeValue;
  notificationLastReadTimeInMs?: number;
  sideBarWidthInPercent?: number;
  timeSeriesSettingsPaneOpened?: boolean;
  timeSeriesCardMinWidth?: number | null;
  stepSelectorEnabled?: boolean;
  rangeSelectionEnabled?: boolean;
  linkedTimeEnabled?: boolean;
  singleSelectionHeaders?: ColumnHeader[];
  rangeSelectionHeaders?: ColumnHeader[];
  dashboardDisplayedHparamColumns?: ColumnHeader[];
  savingPinsEnabled?: boolean;
}
