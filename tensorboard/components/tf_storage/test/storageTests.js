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
var tf_storage;
(function (tf_storage) {
    /* tslint:disable:no-namespace */
    describe('URIStorage', function () {
        it('get/setString', function () {
            tf_storage.setString('key_a', 'hello', false);
            tf_storage.setString('key_b', 'there', false);
            chai.assert.equal('hello', tf_storage.getString('key_a', false));
            chai.assert.equal('there', tf_storage.getString('key_b', false));
            chai.assert.equal(null, tf_storage.getString('key_c', false));
        });
        it('get/setNumber', function () {
            tf_storage.setNumber('key_a', 12, false);
            tf_storage.setNumber('key_b', 3.4, false);
            chai.assert.equal(12, tf_storage.getNumber('key_a', false));
            chai.assert.equal(3.4, tf_storage.getNumber('key_b', false));
            chai.assert.equal(null, tf_storage.getNumber('key_c', false));
        });
        it('get/setObject', function () {
            var obj = { 'foo': 2.3, 'bar': 'barstr' };
            tf_storage.setObject('key_a', obj, false);
            chai.assert.deepEqual(obj, tf_storage.getObject('key_a', false));
        });
        it('get/setWeirdValues', function () {
            tf_storage.setNumber('key_a', NaN, false);
            chai.assert.deepEqual(NaN, tf_storage.getNumber('key_a', false));
            tf_storage.setNumber('key_a', +Infinity, false);
            chai.assert.equal(+Infinity, tf_storage.getNumber('key_a', false));
            tf_storage.setNumber('key_a', -Infinity, false);
            chai.assert.equal(-Infinity, tf_storage.getNumber('key_a', false));
            tf_storage.setNumber('key_a', 1 / 3, false);
            chai.assert.equal(1 / 3, tf_storage.getNumber('key_a', false));
            tf_storage.setNumber('key_a', -0, false);
            chai.assert.equal(-0, tf_storage.getNumber('key_a', false));
        });
        it('set/getTab', function () {
            tf_storage.setString(tf_storage.TAB, 'scalars', false);
            chai.assert.equal('scalars', tf_storage.getString(tf_storage.TAB, false));
        });
    });
})(tf_storage || (tf_storage = {})); // namespace tf_storage
