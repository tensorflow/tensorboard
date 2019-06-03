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

  it('get/setString', async () => {
    await setString('key_a', 'hello', option);
    await setString('key_b', 'there', option);
    assert.equal('hello', await getString('key_a', option));
    assert.equal('there', await getString('key_b', option));
    assert.equal(null, await getString('key_c', option));
  });

  it('get/setNumber', async () => {
    await setNumber('key_a', 12, option);
    await setNumber('key_b', 3.4, option);
    assert.equal(12, await getNumber('key_a', option));
    assert.equal(3.4, await getNumber('key_b', option));
    assert.equal(null, await getNumber('key_c', option));
  });

  it('get/setObject', async () => {
    const obj = {'foo': 2.3, 'bar': 'barstr'};
    await setObject('key_a', obj, option);
    assert.deepEqual(obj, await getObject('key_a', option));
  });

  it('get/setWeirdValues', async () => {
    await setNumber('key_a', NaN, option);
    assert.deepEqual(NaN, await getNumber('key_a', option));

    await setNumber('key_a', +Infinity, option);
    assert.equal(+Infinity, await getNumber('key_a', option));

    await setNumber('key_a', -Infinity, option);
    assert.equal(-Infinity, await getNumber('key_a', option));

    await setNumber('key_a', 1 / 3, option);
    assert.equal(1 / 3, await getNumber('key_a', option));

    await setNumber('key_a', -0, option);
    assert.equal(-0, await getNumber('key_a', option));
  });

  it('set/getTab', async () => {
    await setString(TAB, 'scalars', option);
    assert.equal('scalars', await getString(TAB, option));
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

        let sandbox = null;
        let customBinding = null;
        let getStringStub = null;

        function setValue(key: string, value: string): void {
          if (useLocalStorage) window.localStorage.setItem(key, value);
          else setHash(`${key}=${value}`);
          getStringStub.withArgs(key, sinon.match.any).returns(value);
        }

        /**
         * HACK: because `get` and `set` are asynchronous, it, with above stub,
         * takes a microtask to get the value. Since we cannot effectively
         * control that and make it synchronous, we fake a tick by enqueuing
         * another microtask that, in a test, we await.
         */
        function tick() {
          return getStringStub('foo');
        }

        beforeEach(() => {
          sandbox = sinon.sandbox.create();
          customBinding = makeBindings(x => x, x => x);
          getStringStub = sandbox.stub(customBinding, 'get');
        });

        afterEach(() => {
          sandbox.restore();
          sandbox = null;
          customBinding = null;
          getStringStub = null;
        });

        it('sets the polymerProperty with the defaultValue', async () => {
          setValue('foo', 'bar');
          const initializer = customBinding.getInitializer('foo', options);
          const fakeScope = {prop: 'meow'};
          assert.equal(initializer.call(fakeScope), 'baz');
        });

        it('sets the polymerProperty with the value async', async () => {
          setValue('foo', 'bar');
          const initializer = customBinding.getInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);
          await tick();

          assert.equal(fakeScope.prop, 'bar');
        });

        it('sets the prop with defaultValue when value is missing', async () => {
          getStringStub.withArgs('foo', sinon.match.any).returns('baz');
          const initializer = customBinding.getInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);
          await tick();

          assert.equal(fakeScope.prop, 'baz');
        });

        it(`reacts to '${eventName}' and sets the new value (simulated)`, async () => {
          setValue('foo', '');

          const initializer = customBinding.getInitializer('foo', options);
          const fakeScope = {prop: null};
          initializer.call(fakeScope);
          await tick();

          // Simulate the hashchange.
          setValue('foo', 'changed');
          window.dispatchEvent(new Event(eventName));
          await tick();

          assert.equal(fakeScope.prop, 'changed');
        });

        // It is hard to test against real URL hash and we use fakeHash for
        // testing and fakeHash does not emit any event for a change.
        if (useLocalStorage) {
          it(`reacts to change and sets the new value (real)`, async () => {
            await customBinding.set('foo', '', options);
            // We do not need the `get` stub.
            getStringStub.restore();

            const initializer = customBinding.getInitializer('foo', options);
            const fakeScope1 = {prop: null};
            initializer.call(fakeScope1);
            const fakeScope2 = {prop: 'bar'};
            initializer.call(fakeScope2);
            await tick();

            await customBinding.set('foo', 'changed', options);
            // `set` triggers event that makes initializer re-fetch the value
            // in asynchronous fashion. tick for that.
            await tick();

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

    it('sets url hash', async () => {
      await setNumber(keyName, 1, option);
      assert.isTrue(getHash().includes(keyName));
    });

    it('unsets url hash when value equals defaultValue', async () => {
      await setNumber(keyName, 1, Object.assign({}, option, {defaultValue: 0}));
      assert.isTrue(getHash().includes(keyName));

      // If previous value on hash (which is 1 from above) matches the new value
      // it does not unset the url value.
      await setNumber(keyName, 1, Object.assign({}, option, {defaultValue: 2}));
      assert.isTrue(getHash().includes(keyName));

      await setNumber(keyName, 2, Object.assign({}, option, {defaultValue: 2}));
      assert.isFalse(getHash().includes(keyName));
    });
  });
});

}  // namespace tf_storage
