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

import {AppRootProvider, RESOLVED_APP_ROOT} from './app_root';
import {Location} from './location';

describe('app root', () => {
  let getHrefSpy: jasmine.Spy;

  beforeEach(async () => {
    getHrefSpy = jasmine.createSpy();
    await TestBed.configureTestingModule({
      providers: [Location, AppRootProvider],
    }).compileComponents();

    const location = TestBed.inject(Location);
    getHrefSpy = spyOn(location, 'getHref').and.returnValue('https://tb.dev/');
  });

  function setMetaContentAndGetAppRoot(content: string): string {
    const meta = document.createElement('meta');
    meta.name = 'tb-relative-root';
    meta.content = content;
    document.head.appendChild(meta);
    const appRoot = TestBed.inject(RESOLVED_APP_ROOT);
    document.head.removeChild(meta);
    return appRoot;
  }

  [
    {href: 'https://tb.dev/', content: './', expected: '/'},
    {href: 'https://tb.dev/index.html', content: './', expected: '/'},
    {
      href: 'https://tb.dev/foo/bar/experiment/1/',
      content: '../../',
      expected: '/foo/bar/',
    },
    // wrong relative content but we handle it correctly.
    {href: 'https://tb.dev/', content: '../../', expected: '/'},
    {href: 'https://tb.dev/', content: './/', expected: '/'},
    {href: 'https://tb.dev/experiment/1/', content: '../..///', expected: '/'},
  ].forEach(({content, href, expected}) => {
    it(`using <meta> content, returns an absolute path: ${href} and ${content}`, () => {
      getHrefSpy.and.returnValue(href);
      expect(setMetaContentAndGetAppRoot(content)).toBe(expected);
    });
  });
});
