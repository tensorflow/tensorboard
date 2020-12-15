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
import {format, scaleTime} from '../../../third_party/d3';

export interface Formatter {
  /**
   * Represents a number in a string that would fit in ticks of a chart (max ~50px).
   *
   * Possible usage: tick labels on line chart.
   */
  formatTick(x: number): string;

  /**
   * Represents a number in a short string that would appear in a UI with a limited
   * space that is larger than a tick.
   *
   * Possible usage: major tick labels on line chart.
   */
  formatShort(x: number): string;

  /**
   * Represents a number in a human readable string. The string can be a
   * "lossy compression" and it must follow localization.
   *
   * Possible usage: tooltips on a line chart.
   */
  formatReadable(x: number): string;
}

/**
 * ================
 * NUMBER FORMATTER
 * ================
 */

const d3NumberFormatter = format('.2~e');
const d3TrimFormatter = format('~');
const d3LongFormatter = format(',~');

function formatNumberShort(x: number): string {
  if (x === 0) {
    return '0';
  }

  const absNum = Math.abs(x);
  if (absNum >= 100000 || absNum < 0.001) {
    return d3NumberFormatter(x);
  }

  return d3TrimFormatter(x);
}

export const numberFormatter: Formatter = {
  formatTick: formatNumberShort,
  formatShort: formatNumberShort,
  formatReadable(x: number): string {
    return d3LongFormatter(x);
  },
};

/**
 * =======================
 * RELATIVE TIME FORMATTER
 * =======================
 */

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

const d3FloatFormatter = format('.4~');

/**
 * Formats relative time in milliseconds with human readable unit.
 */
function formatRelativeTime(x: number): string {
  if (x === 0) return '0';

  let str = Math.sign(x) > 0 ? '' : '-';
  const absX = Math.abs(x);
  if (absX < SECOND_IN_MS) {
    str += `${d3FloatFormatter(absX)} ms`;
  } else if (absX < MINUTE_IN_MS) {
    str += `${d3FloatFormatter(absX / SECOND_IN_MS)} sec`;
  } else if (absX < HOUR_IN_MS) {
    str += `${d3FloatFormatter(absX / MINUTE_IN_MS)} min`;
  } else if (absX < DAY_IN_MS) {
    str += `${d3FloatFormatter(absX / HOUR_IN_MS)} hr`;
  } else if (absX < YEAR_IN_MS) {
    str += `${d3FloatFormatter(absX / DAY_IN_MS)} day`;
  } else {
    str += `${d3FloatFormatter(absX / YEAR_IN_MS)} yr`;
  }
  return str;
}

export const relativeTimeFormatter: Formatter = {
  formatTick: formatRelativeTime,
  formatShort: formatRelativeTime,
  formatReadable: formatRelativeTime,
};

/**
 * ===================
 * WALL TIME FORMATTER
 * ===================
 */

const d3TimeTickFormat = scaleTime().tickFormat();

let localeOverride: string | undefined = undefined;

export const wallTimeFormatter: Formatter = {
  formatTick(x: number): string {
    return d3TimeTickFormat(new Date(x));
  },
  formatShort(x: number): string {
    // "Nov 19, 2012, 7:00:00 PM"
    return new Date(x).toLocaleString(localeOverride, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  },
  formatReadable(x: number): string {
    // "Nov 19, 2012, 7:00:00.551 PM PST"
    return new Date(x).toLocaleString(localeOverride, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
      // FF 84+ and Chrome 84+ feature.
      fractionalSecondDigits: 3,
    } as any);
  },
};

export const TEST_ONLY = {
  setLocale: (locale: string) => {
    localeOverride = locale;
  },
};
