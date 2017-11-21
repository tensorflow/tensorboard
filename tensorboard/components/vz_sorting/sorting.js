/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_sorting;
(function (vz_sorting) {
    /**
     * Compares tag names asciinumerically broken into components.
     *
     * <p>This is the comparison function used for sorting most string values in
     * TensorBoard. Unlike the standard asciibetical comparator, this function
     * knows that 'a10b' > 'a2b'. Fixed point and engineering notation are
     * supported. This function also splits the input by slash and underscore to
     * perform array comparison. Therefore it knows that 'a/a' < 'a+/a' even
     * though '+' < '/' in the ASCII table.
     */
    function compareTagNames(a, b) {
        var ai = 0;
        var bi = 0;
        while (true) {
            if (ai === a.length) {
                return bi === b.length ? 0 : -1;
            }
            if (bi === b.length) {
                return 1;
            }
            if (isDigit(a[ai]) && isDigit(b[bi])) {
                var ais = ai;
                var bis = bi;
                ai = consumeNumber(a, ai + 1);
                bi = consumeNumber(b, bi + 1);
                var an = parseFloat(a.slice(ais, ai));
                var bn = parseFloat(b.slice(bis, bi));
                if (an < bn) {
                    return -1;
                }
                if (an > bn) {
                    return 1;
                }
                continue;
            }
            if (isBreak(a[ai])) {
                if (!isBreak(b[bi])) {
                    return -1;
                }
            }
            else if (isBreak(b[bi])) {
                return 1;
            }
            else if (a[ai] < b[bi]) {
                return -1;
            }
            else if (a[ai] > b[bi]) {
                return 1;
            }
            ai++;
            bi++;
        }
    }
    vz_sorting.compareTagNames = compareTagNames;
    function consumeNumber(s, i) {
        var State;
        (function (State) {
            State[State["NATURAL"] = 0] = "NATURAL";
            State[State["REAL"] = 1] = "REAL";
            State[State["EXPONENT_SIGN"] = 2] = "EXPONENT_SIGN";
            State[State["EXPONENT"] = 3] = "EXPONENT";
        })(State || (State = {}));
        var state = State.NATURAL;
        for (; i < s.length; i++) {
            if (state === State.NATURAL) {
                if (s[i] === '.') {
                    state = State.REAL;
                }
                else if (s[i] === 'e' || s[i] === 'E') {
                    state = State.EXPONENT_SIGN;
                }
                else if (!isDigit(s[i])) {
                    break;
                }
            }
            else if (state === State.REAL) {
                if (s[i] === 'e' || s[i] === 'E') {
                    state = State.EXPONENT_SIGN;
                }
                else if (!isDigit(s[i])) {
                    break;
                }
            }
            else if (state === State.EXPONENT_SIGN) {
                if (isDigit(s[i]) || s[i] === '+' || s[i] === '-') {
                    state = State.EXPONENT;
                }
                else {
                    break;
                }
            }
            else if (state === State.EXPONENT) {
                if (!isDigit(s[i])) {
                    break;
                }
            }
        }
        return i;
    }
    function isDigit(c) {
        return '0' <= c && c <= '9';
    }
    function isBreak(c) {
        // TODO(@jart): Remove underscore when people stop using it like a slash.
        return c === '/' || c === '_' || isDigit(c);
    }
})(vz_sorting || (vz_sorting = {})); // namespace vz_sorting
