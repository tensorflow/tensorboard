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
import {escapeForRegex} from './string';

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
