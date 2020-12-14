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
  formatTick(x: number): string;
  formatShort(x: number): string;
  formatLong(x: number): string;
}

const d3NumberFormatter = format('.2~e');
const d3TrimFormatter = format('~');
const d3FloatFormatter = format('.4~');
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
  formatLong(x: number): string {
    return d3LongFormatter(x);
  },
};

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

function formatTime(x: number): string {
  if (x === 0) return '0';

  const sign = x <= 0 ? -1 : 1;
  const builder = [];
  const absX = Math.abs(x);
  if (absX < SECOND_IN_MS) {
    builder.push(d3FloatFormatter(absX), 'ms');
  } else if (absX < MINUTE_IN_MS) {
    builder.push(d3FloatFormatter(absX / SECOND_IN_MS), 'sec');
  } else if (absX < HOUR_IN_MS) {
    builder.push(d3FloatFormatter(absX / MINUTE_IN_MS), 'min');
  } else if (absX < DAY_IN_MS) {
    builder.push(d3FloatFormatter(absX / HOUR_IN_MS), 'hr');
  } else if (absX < YEAR_IN_MS) {
    builder.push(d3FloatFormatter(absX / DAY_IN_MS), 'day');
  } else {
    builder.push(d3FloatFormatter(absX / YEAR_IN_MS), 'yr');
  }
  return `${sign === 1 ? '' : '-'}${builder.join('')}`;
}

export const relativeTimeFormatter: Formatter = {
  formatTick: formatTime,
  formatShort: formatTime,
  formatLong: formatTime,
};

const d3TimeTickFormat = scaleTime().tickFormat();

let localeOverride: string | undefined = undefined;

export const timeFormatter: Formatter = {
  formatTick(x: number): string {
    return d3TimeTickFormat(new Date(x));
  },
  formatShort(x: number): string {
    // "11/19/12, 7:00:00 PM"
    return new Date(x).toLocaleString(localeOverride, {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  },
  formatLong(x: number): string {
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
