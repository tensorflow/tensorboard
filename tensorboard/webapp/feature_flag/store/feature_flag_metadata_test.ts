import {parseBoolean, parseBooleanOrNull} from './feature_flag_metadata';

/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
describe('feature flag query parameters', () => {
  describe('parseBoolean', () => {
    it('"false" should evaluate to false', () => {
      expect(parseBoolean('false')).toBeFalse();
    });

    it('values other than "false" should evaluate to true', () => {
      expect(parseBoolean('true')).toBeTrue();
      expect(parseBoolean('foo bar')).toBeTrue();
      expect(parseBoolean('')).toBeTrue();
    });
  });

  describe('parseBooleanOrNull', () => {
    it('"null" should return null', () => {
      expect(parseBooleanOrNull('null')).toBeNull();
    });

    it('"false" should evaluate to false', () => {
      expect(parseBooleanOrNull('false')).toBeFalse();
    });

    it('values other than "false" should evaluate to true', () => {
      expect(parseBooleanOrNull('true')).toBeTrue();
      expect(parseBooleanOrNull('foo bar')).toBeTrue();
      expect(parseBooleanOrNull('')).toBeTrue();
    });
  });
});
