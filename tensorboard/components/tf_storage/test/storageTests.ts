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

const {assert} = chai;


function setHash(hash) {
  tf_globals.setFakeHash(hash);
}

function getHash(): string {
  return tf_globals.getFakeHash();
}


/* tslint:disable:no-namespace */
describe('Storage', () => {
  const option = {useLocalStorage: false};

  afterEach(() => {
    setHash('');
    window.localStorage.clear();
    disposeStringBinding();
    disposeNumberBinding();
    disposeBooleanBinding();
    disposeObjectBinding()
  });

  it('get/setString', () => {
    setString('key_a', 'hello', option);
    setString('key_b', 'there', option);
    assert.equal('hello', getString('key_a', option));
    assert.equal('there', getString('key_b', option));
    assert.equal(null, getString('key_c', option));
  });

  it('get/setNumber', () => {
    setNumber('key_a', 12, option);
    setNumber('key_b', 3.4, option);
    assert.equal(12, getNumber('key_a', option));
    assert.equal(3.4, getNumber('key_b', option));
    assert.equal(null, getNumber('key_c', option));
  });

  it('get/setObject', () => {
    const obj = {'foo': 2.3, 'bar': 'barstr'};
    setObject('key_a', obj, option);
    assert.deepEqual(obj, getObject('key_a', option));
  });

  it('get/setWeirdValues', () => {
    setNumber('key_a', NaN, option);
    assert.deepEqual(NaN, getNumber('key_a', option));

    setNumber('key_a', +Infinity, option);
    assert.equal(+Infinity, getNumber('key_a', option));

    setNumber('key_a', -Infinity, option);
    assert.equal(-Infinity, getNumber('key_a', option));

    setNumber('key_a', 1 / 3, option);
    assert.equal(1 / 3, getNumber('key_a', option));

    setNumber('key_a', -0, option);
    assert.equal(-0, getNumber('key_a', option));
  });

  it('set/getTab', () => {
    setString(TAB, 'scalars', option);
    assert.equal('scalars', getString(TAB, option));
  });

  describe('getInitializer', () => {
    [
      {useLocalStorage: true, name: 'local storage', eventName: 'storage'},
      {useLocalStorage: false, name: 'hash storage', eventName: 'hashchange'}
    ].forEach(({useLocalStorage, name, eventName}) => {
      describe(name, () => {
        const options = {
          useLocalStorage,
          defaultValue: 'baz',
          polymerProperty: 'prop',
        };

        function setValue(key: string, value: string): void {
          if (useLocalStorage) window.localStorage.setItem(key, value);
          else setHash(`${key}=${value}`);
        }

        it('sets the polymerProperty with the value', () => {
          setValue('foo', 'bar');
          const initializer = getStringInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);
          assert.equal(fakeScope.prop, 'bar');
        });

        it('sets the prop with defaultValue when value is missing', () => {
          const initializer = getStringInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);
          assert.equal(fakeScope.prop, 'baz');
        });

        it(`reacts to '${eventName}' and sets the new value (simulated)`, () => {
          setValue('foo', '');

          const initializer = getStringInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);

          // Simulate the hashchange.
          setValue('foo', 'changed');
          window.dispatchEvent(new Event(eventName));

          assert.equal(fakeScope.prop, 'changed');
        });

        // It is hard to test against real URL hash and we use fakeHash for
        // testing and fakeHash does not emit any event for a change.
        if (useLocalStorage) {
          it(`reacts to change and sets the new value (real)`, () => {
            setString('foo', '', options);

            const initializer = getStringInitializer('foo', options);
            const fakeScope1 = {prop: null};
            initializer.call(fakeScope1);
            const fakeScope2 = {prop: 'bar'};
            initializer.call(fakeScope2);

            setString('foo', 'changed', options);

            assert.equal(fakeScope1.prop, 'changed');
            assert.equal(fakeScope2.prop, 'changed');
          });
        }
      });
    });
  });

  describe('advanced setter', () => {
    const keyName = 'key';

    beforeEach(() => {
      assert.isFalse(getHash().includes(keyName));
    });

    it('sets url hash', () => {
      setNumber(keyName, 1, option);
      assert.isTrue(getHash().includes(keyName));
    });

    it('unsets url hash when value equals defaultValue', () => {
      setNumber(keyName, 1, Object.assign({}, option, {defaultValue: 0}));
      assert.isTrue(getHash().includes(keyName));

      // If previous value on hash (which is 1 from above) matches the new value
      // it does not unset the url value.
      setNumber(keyName, 1, Object.assign({}, option, {defaultValue: 2}));
      assert.isTrue(getHash().includes(keyName));

      setNumber(keyName, 2, Object.assign({}, option, {defaultValue: 2}));
      assert.isFalse(getHash().includes(keyName));
    });
  });
});

}  // namespace tf_storage
