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
import {getTagDisplayName} from './utils';

describe('metrics view utils', () => {
  describe('getTagDisplayName', () => {
    it('removes group prefix and suffix if possible', () => {
      expect(getTagDisplayName('layer/foo', 'layer')).toBe('foo');
      expect(getTagDisplayName('layer/foo', 'loss')).toBe('layer/foo');
      expect(getTagDisplayName('layerfoo', 'layer')).toBe('layerfoo');
      expect(getTagDisplayName('layer/foo/scalar_summary', 'layer')).toBe(
        'foo'
      );
      expect(getTagDisplayName('foo/scalar_summary', '')).toBe('foo');
      expect(getTagDisplayName('fooscalar_summary', '')).toBe(
        'fooscalar_summary'
      );
      expect(getTagDisplayName('layer/scalar_summary', '')).toBe('layer');
      expect(getTagDisplayName('layer//foo', 'layer')).toBe('/foo');
    });

    it('handles null group name', () => {
      expect(getTagDisplayName('layer/foo', null)).toBe('layer/foo');
      expect(getTagDisplayName('foo/scalar_summary', null)).toBe('foo');
      expect(getTagDisplayName('fooscalar_summary', null)).toBe(
        'fooscalar_summary'
      );
      expect(getTagDisplayName('layer/scalar_summary', null)).toBe('layer');
    });

    it('uses tag as fallback if removal leaves empty string', () => {
      expect(getTagDisplayName('layer/', 'layer')).toBe('layer/');
      expect(getTagDisplayName('/scalar_summary', '')).toBe('/scalar_summary');
    });
  });
});
