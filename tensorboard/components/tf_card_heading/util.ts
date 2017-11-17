/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_card_heading {

/**
 * Formats timestamp for the card header.
 * @param {Date} date
 * @return {string}
 */
export function formatDate(date) {
  if (!date) {
    return '';
  }
  // Turn things like "GMT-0700 (PDT)" into just "PDT".
  return date.toString().replace(/GMT-\d+ \(([^)]+)\)/, '$1');
}

/**
 * Returns CSS color that will contrast against background.
 * @param {?string} background RGB hex color code, e.g. #eee, #eeeeee.
 * @return {string}
 */
export function pickTextColor(background) {
  const rgb = convertHexToRgb(background);
  if (!rgb) {
    return 'inherit';
  }
  // See: http://www.w3.org/TR/AERT#color-contrast
  const brightness = Math.round((rgb[0] * 299 +
                                 rgb[1] * 587 +
                                 rgb[2] * 114) / 1000);
  return brightness > 125 ? 'inherit' : '#eee';
}

/**
 * Turns a hex string into an RGB array.
 * @param {?string} color RGB hex color code, e.g. #eee, #eeeeee.
 * @return {Array<number>}
 */
function convertHexToRgb(color) {
  if (!color) {
    return null;
  }
  let m = color.match(/^#([0-9a-f]{1,2})([0-9a-f]{1,2})([0-9a-f]{1,2})$/);
  if (!m) {
    return null;
  }
  if (color.length == 4) {
    for (var i = 1; i <= 3; i++) {
      m[i] = m[i] + m[i];
    }
  }
  return [parseInt(m[1], 16),
          parseInt(m[2], 16),
          parseInt(m[3], 16)];
}

}  // namespace tf_card_heading
