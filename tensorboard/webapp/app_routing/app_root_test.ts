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
import {TestBed} from '@angular/core/testing';
import {AppRootProvider, TestableAppRootProvider} from './app_root';
import {Location} from './location';

describe('app root', () => {
  let getHrefSpy: jasmine.Spy;

  beforeEach(async () => {
    getHrefSpy = jasmine.createSpy();
    await TestBed.configureTestingModule({
      providers: [
        Location,
        {provide: AppRootProvider, useClass: TestableAppRootProvider},
      ],
    }).compileComponents();

    const location = TestBed.inject(Location);
    getHrefSpy = spyOn(location, 'getHref').and.returnValue('https://tb.dev/');
  });

  function setUp(href: string, content: string): TestableAppRootProvider {
    getHrefSpy.and.returnValue(href);
    const meta = document.createElement('meta');
    meta.name = 'tb-relative-root';
    meta.content = content;
    document.head.appendChild(meta);
    const appRoot = TestBed.inject(AppRootProvider) as TestableAppRootProvider;
    document.head.removeChild(meta);
    return appRoot;
  }

  [
    {href: 'https://tb.dev/', content: './', expectedAppRoot: '/'},
    {href: 'https://tb.dev/index.html', content: './', expectedAppRoot: '/'},
    {
      href: 'https://tb.dev/foo/bar/experiment/1/',
      content: '../../',
      expectedAppRoot: '/foo/bar/',
    },
    // wrong relative content but we handle it correctly.
    {href: 'https://tb.dev/', content: '../../', expectedAppRoot: '/'},
    {href: 'https://tb.dev/', content: './/', expectedAppRoot: '/'},
    {
      href: 'https://tb.dev/experiment/1/',
      content: '../..///',
      expectedAppRoot: '/',
    },
  ].forEach(({content, href, expectedAppRoot}) => {
    describe('appRoot parsing', () => {
      it(`returns an absolute path from <meta>: ${href} and ${content}`, () => {
        expect(setUp(href, content).getAppRoot()).toBe(expectedAppRoot);
      });
    });
  });

  describe('#getAbsPathnameWithAppRoot', () => {
    it('returns pathname with appRoot', () => {
      expect(
        setUp(
          'https://tb.dev/foo/bar/experiment/1/',
          '../../'
        ).getAbsPathnameWithAppRoot('/cool/test')
      ).toBe(`/foo/bar/cool/test`);
    });
  });

  describe('#getAppRootlessPathname', () => {
    it('returns a path without app root', () => {
      const provider = setUp('https://tb.dev/foo/bar/experiment/1/', '../../');
      expect(provider.getAppRootlessPathname('/foo/bar/')).toBe('/');
      expect(provider.getAppRootlessPathname('/foo/bar/baz')).toBe('/baz');
    });

    it('does not strip if pathname does not start with appRoot', () => {
      const provider = setUp('https://tb.dev/foo/bar/experiment/1/', '../../');
      // misses trailing "/" to exactly match the appRoot.
      expect(provider.getAppRootlessPathname('/foo/bar')).toBe('/foo/bar');
      expect(provider.getAppRootlessPathname('/bar')).toBe('/bar');
      expect(provider.getAppRootlessPathname('/fan/foo/bar')).toBe(
        '/fan/foo/bar'
      );
    });
  });
});
