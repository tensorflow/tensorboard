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

import {Location, TEST_ONLY} from './location';

describe('location', () => {
  let location: Location;

  beforeEach(() => {
    location = new Location();
  });

  describe('#getHref', () => {
    it('returns href', () => {
      spyOn(TEST_ONLY.utils, 'getHref').and.returnValue(
        'https://t.b/is/cool/product'
      );
      expect(location.getHref()).toBe('https://t.b/is/cool/product');
    });
  });

  describe('#getResolvedPath', () => {
    it('forms absolute path from current href', () => {
      spyOn(TEST_ONLY.utils, 'getHref').and.returnValue(
        'https://t.b/is/cool/product'
      );
      expect(location.getResolvedPath('/foo')).toBe('/foo');
    });

    it('resolves absolute path', () => {
      spyOn(TEST_ONLY.utils, 'getHref').and.returnValue(
        'https://t.b/is/cool/product'
      );
      expect(location.getResolvedPath('/foo/bar')).toBe('/foo/bar');
    });

    it('resolves relative path', () => {
      spyOn(TEST_ONLY.utils, 'getHref').and.returnValue(
        'https://t.b/is/cool/product'
      );
      expect(location.getResolvedPath('../foo/')).toBe('/is/foo/');
    });

    it('resolves path without slash or dot', () => {
      spyOn(TEST_ONLY.utils, 'getHref').and.returnValue(
        'https://t.b/is/cool/product'
      );
      expect(location.getResolvedPath('foo/')).toBe('/is/cool/foo/');
    });
  });

  describe('#getFullPathFromRouteOrNav', () => {
    it('forms the full path', () => {
      expect(
        location.getFullPath('/foo/bar/baz', [{key: 'a', value: '1'}])
      ).toBe('/foo/bar/baz?a=1');
    });

    it('does not add "?" when queryParams is empty', () => {
      expect(location.getFullPath('/foo', [])).toBe('/foo');
    });
  });
});
