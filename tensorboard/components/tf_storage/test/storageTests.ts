/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace tf_storage {

/* tslint:disable:no-namespace */
describe('URIStorage', () => {
  it('get/setString', () => {
    setString('key_a', 'hello', {useLocalStorage: false});
    setString('key_b', 'there', {useLocalStorage: false});
    chai.assert.equal('hello', getString('key_a', {useLocalStorage: false}));
    chai.assert.equal('there', getString('key_b', {useLocalStorage: false}));
    chai.assert.equal(null, getString('key_c', {useLocalStorage: false}));
  });

  it('get/setNumber', () => {
    setNumber('key_a', 12, {useLocalStorage: false});
    setNumber('key_b', 3.4, {useLocalStorage: false});
    chai.assert.equal(12, getNumber('key_a', {useLocalStorage: false}));
    chai.assert.equal(3.4, getNumber('key_b', {useLocalStorage: false}));
    chai.assert.equal(null, getNumber('key_c', {useLocalStorage: false}));
  });

  it('get/setObject', () => {
    const obj = {'foo': 2.3, 'bar': 'barstr'};
    setObject('key_a', obj, {useLocalStorage: false});
    chai.assert.deepEqual(obj, getObject('key_a', {useLocalStorage: false}));
  });

  it('get/setWeirdValues', () => {
    setNumber('key_a', NaN, {useLocalStorage: false});
    chai.assert.deepEqual(NaN, getNumber('key_a', {useLocalStorage: false}));

    setNumber('key_a', +Infinity, {useLocalStorage: false});
    chai.assert.equal(+Infinity, getNumber('key_a', {useLocalStorage: false}));

    setNumber('key_a', -Infinity, {useLocalStorage: false});
    chai.assert.equal(-Infinity, getNumber('key_a', {useLocalStorage: false}));

    setNumber('key_a', 1 / 3, {useLocalStorage: false});
    chai.assert.equal(1 / 3, getNumber('key_a', {useLocalStorage: false}));

    setNumber('key_a', -0, {useLocalStorage: false});
    chai.assert.equal(-0, getNumber('key_a', {useLocalStorage: false}));
  });

  it('set/getTab', () => {
    setString(TAB, 'scalars', {useLocalStorage: false});
    chai.assert.equal('scalars', getString(TAB, {useLocalStorage: false}));
  });
});

}  // namespace tf_storage
