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
/**
 * This regex escape character set is also used in lodash's `escapeRegExp`.
 */
const REGEXP_ESCAPE_CHARS = /[\\^$.*+?()[\]{}|]/g;

/**
 * Converts a string into a form that has been escaped for use as a literal
 * argument to a regular expression constructor.
 *
 * Takes a string V and escapes characters to produce a new string E, such that
 * new RegExp(E).test(V) === true.
 */
export function escapeForRegex(value: string): string {
  // '$&' in a regex replacement indicates the last match.
  return value.replace(REGEXP_ESCAPE_CHARS, '\\$&');
}

/**
 * Processes text from left-to-right, splitting it into pieces based on the
 * regex. Each piece is either an unmatched or a matched substring.
 *
 * For example,
 * splitByRegex("a input1 b input2 c input3", /input\d/)
 * returns
 * [
 *    {index: 0,  matchesRegex: false, text: "a "},
 *    {index: 2,  matchesRegex: true,  text: "input1"},
 *    {index: 8,  matchesRegex: false, text: " b "},
 *    {index: 11, matchesRegex: true,  text: "input2"},
 *    {index: 17, matchesRegex: false, text: " c "},
 *    {index: 20, matchesRegex: true,  text: "input3"},
 * ]
 */
export function splitByRegex(
  text: string,
  regex: RegExp
): Array<{index: number; matchesRegex: boolean; text: string}> {
  // 'matchAll' requires a regex with the 'global' flag.
  if (!regex.flags.includes('g')) {
    regex = new RegExp(regex, regex.flags + 'g');
  }

  const result = [];

  // Index of the earliest unvisited character.
  let lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const index = match.index as number;
    const matchingText = match[0];

    // Add any text between the last match and this current one.
    if (index > lastIndex) {
      result.push({
        index: lastIndex,
        text: text.substring(lastIndex, index),
        matchesRegex: false,
      });
    }

    result.push({
      index,
      text: matchingText,
      matchesRegex: true,
    });

    lastIndex = index + matchingText.length;
  }

  // Add the remaining text piece, if any.
  if (text.length > lastIndex) {
    result.push({
      index: lastIndex,
      text: text.substring(lastIndex, text.length),
      matchesRegex: false,
    });
  }

  return result;
}

// Based on
// https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/console/ConsoleViewMessage.js?q=linkstringregex
const URL_CONTROL_CODES = '\\u0000-\\u0020\\u007f-\\u009f';
const LINKIFY_URL_REGEX = new RegExp(
  '(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' +
    URL_CONTROL_CODES +
    '"]{2,}[^\\s' +
    URL_CONTROL_CODES +
    '"\')}\\],:;.!?]',
  'gu'
);

/**
 * Splits the string into pieces that are URLs and non-URLs for linkification.
 * Invalid links (e.g. 'javascript:') are not linkified.
 *
 * For example,
 * splitByURL("visit http://example.com today")
 * Returns
 * [
 *   {isUrl: false, text: "visit "},
 *   {isUrl: true,  text: "http://example.com"},
 *   {isUrl: false, text: " today"},
 * ]
 */
export function splitByURL(text: string): {isURL: boolean; text: string}[] {
  return splitByRegex(text, LINKIFY_URL_REGEX).map(({matchesRegex, text}) => {
    return {isURL: matchesRegex, text};
  });
}
