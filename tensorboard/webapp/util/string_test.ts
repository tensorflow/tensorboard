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
import {escapeForRegex, splitByRegex, splitByURL} from './string';

describe('escapeForRegex test', () => {
  it('escapes unsafe characters', () => {
    expect(escapeForRegex('.')).toEqual('\\.');

    // Multiple occurrences.
    expect(escapeForRegex('...')).toEqual('\\.\\.\\.');

    // Multiple different characters.
    expect(escapeForRegex('\\foo.bar[baz]')).toEqual('\\\\foo\\.bar\\[baz\\]');
  });

  it('does not alter safe characters', () => {
    expect(escapeForRegex('foo://bar@baz')).toEqual('foo://bar@baz');
    expect(escapeForRegex('1 - 2')).toEqual('1 - 2');
    expect(escapeForRegex('a_b')).toEqual('a_b');
  });
});

describe('splitByRegex', () => {
  it('properly splits when there is no match', () => {
    expect(splitByRegex('foo', /bar/g)).toEqual([
      {index: 0, matchesRegex: false, text: 'foo'},
    ]);
  });

  it('properly splits when there is a match', () => {
    expect(splitByRegex('bar', /bar/g)).toEqual([
      {index: 0, matchesRegex: true, text: 'bar'},
    ]);
  });

  it('properly splits on match - nomatch', () => {
    expect(splitByRegex('bar foo', /bar/g)).toEqual([
      {index: 0, matchesRegex: true, text: 'bar'},
      {index: 3, matchesRegex: false, text: ' foo'},
    ]);
  });

  it('properly splits on nomatch - match', () => {
    expect(splitByRegex('foo bar', /bar/g)).toEqual([
      {index: 0, matchesRegex: false, text: 'foo '},
      {index: 4, matchesRegex: true, text: 'bar'},
    ]);
  });

  it('properly splits on match - nomatch - match', () => {
    expect(splitByRegex('bar foo bar', /bar/g)).toEqual([
      {index: 0, matchesRegex: true, text: 'bar'},
      {index: 3, matchesRegex: false, text: ' foo '},
      {index: 8, matchesRegex: true, text: 'bar'},
    ]);
  });

  it('properly splits multiple matches from left to right', () => {
    expect(splitByRegex('aaaaa', /aa/g)).toEqual([
      {index: 0, matchesRegex: true, text: 'aa'},
      {index: 2, matchesRegex: true, text: 'aa'},
      {index: 4, matchesRegex: false, text: 'a'},
    ]);
  });

  it('adds the global flag if needed', () => {
    expect(splitByRegex('aaaaa', /aa/)).toEqual([
      {index: 0, matchesRegex: true, text: 'aa'},
      {index: 2, matchesRegex: true, text: 'aa'},
      {index: 4, matchesRegex: false, text: 'a'},
    ]);
  });
});

describe('splitByURL', () => {
  it('properly extracts proper URLs', () => {
    expect(splitByURL('hi http://hello bye')).toEqual([
      {isURL: false, text: 'hi '},
      {isURL: true, text: 'http://hello'},
      {isURL: false, text: ' bye'},
    ]);

    expect(splitByURL('hi http://hello:6006 bye')).toEqual([
      {isURL: false, text: 'hi '},
      {isURL: true, text: 'http://hello:6006'},
      {isURL: false, text: ' bye'},
    ]);

    expect(splitByURL('hi www.example.com bye')).toEqual([
      {isURL: false, text: 'hi '},
      {isURL: true, text: 'www.example.com'},
      {isURL: false, text: ' bye'},
    ]);
  });

  it('does not extract invalid URLs', () => {
    expect(splitByURL('hi javascript:foo bye')).toEqual([
      {isURL: false, text: 'hi javascript:foo bye'},
    ]);
  });
});
