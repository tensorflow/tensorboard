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
import {DeepReadonly} from '../util/types';
import {CardGroup, CardIdWithMetadata} from './types';

export function groupCardIdWithMetdata(
  cards: DeepReadonly<CardIdWithMetadata[]>
): CardGroup[] {
  const tagPrefix = new Map<string, CardGroup>();

  const sortedCards = cards.slice().sort((cardA, cardB) => {
    return compareTagNames(cardA.tag, cardB.tag);
  });

  for (const card of sortedCards) {
    const groupName = getTagGroupName(card.tag);

    if (!tagPrefix.has(groupName)) {
      tagPrefix.set(groupName, {groupName, items: []});
    }

    tagPrefix.get(groupName)!.items.push(card);
  }

  return [...tagPrefix.values()];
}

function getTagGroupName(tag: string): string {
  return tag.split('/', 1)[0];
}

// TODO(b/154055328): combine this with the OSS ts_library compat version.
// Adopted from tensorboard/components/vz_sorting/sorting.js
// Delta:
// - better typing
// - human readable variable names
// - removed componentization by "_".

/**
 * Compares tag names asciinumerically broken into components.
 *
 * Unlike the standard asciibetical comparator, this function knows that 'a10b'
 * > 'a2b'. Fixed point and engineering notation are supported. This function
 * also splits the input by slash to perform array comparison. Therefore it
 * knows that 'a/a' < 'a+/a' even though '+' < '/' in the ASCII table.
 */
export function compareTagNames(tagA: string, tagB: string) {
  let aIndex = 0;
  let bIndex = 0;

  while (true) {
    if (aIndex === tagA.length) {
      return bIndex === tagB.length ? 0 : -1;
    }
    if (bIndex === tagB.length) {
      return 1;
    }

    if (isDigit(tagA[aIndex]) && isDigit(tagB[bIndex])) {
      const aNumberStart = aIndex;
      const bNumberStart = bIndex;
      aIndex = consumeNumber(tagA, aIndex + 1);
      bIndex = consumeNumber(tagB, bIndex + 1);
      const an = Number(tagA.slice(aNumberStart, aIndex));
      const bn = Number(tagB.slice(bNumberStart, bIndex));
      if (an < bn) {
        return -1;
      }
      if (an > bn) {
        return 1;
      }
      continue;
    }

    if (isBreak(tagA[aIndex])) {
      if (!isBreak(tagB[bIndex])) {
        return -1;
      }
    } else if (isBreak(tagB[bIndex])) {
      return 1;
    } else if (tagA[aIndex] < tagB[bIndex]) {
      return -1;
    } else if (tagA[aIndex] > tagB[bIndex]) {
      return 1;
    }

    aIndex++;
    bIndex++;
  }
}

/**
 * Returns endIndex of a number sequence in string starting from startIndex.
 *
 * The method can handle scientific notation, real and natural numbers, and
 * numbers with exponents. Do note that it does not treat decimals that start
 * with "." as a real number.
 */
function consumeNumber(s: string, startIndex: number): number {
  enum State {
    NATURAL,
    REAL,
    EXPONENT_SIGN,
    EXPONENT,
  }

  let state = State.NATURAL;
  let i = startIndex;
  for (; i < s.length; i++) {
    if (state === State.NATURAL) {
      if (s[i] === '.') {
        state = State.REAL;
      } else if (s[i] === 'e' || s[i] === 'E') {
        state = State.EXPONENT_SIGN;
      } else if (!isDigit(s[i])) {
        break;
      }
    } else if (state === State.REAL) {
      if (s[i] === 'e' || s[i] === 'E') {
        state = State.EXPONENT_SIGN;
      } else if (!isDigit(s[i])) {
        break;
      }
    } else if (state === State.EXPONENT_SIGN) {
      if (isDigit(s[i]) || s[i] === '+' || s[i] === '-') {
        state = State.EXPONENT;
      } else {
        break;
      }
    } else if (state === State.EXPONENT) {
      if (!isDigit(s[i])) {
        break;
      }
    }
  }
  return i;
}

function isDigit(character: string): boolean {
  return '0' <= character && character <= '9';
}

function isBreak(character: string): boolean {
  return character === '/' || isDigit(character);
}
