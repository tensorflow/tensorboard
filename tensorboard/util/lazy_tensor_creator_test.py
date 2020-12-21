# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import tensorflow as tf

from tensorboard.util import lazy_tensor_creator


tf.compat.v1.enable_eager_execution()


class LazyTensorCreatorTest(tf.test.TestCase):
    def assertEqualAsNumpy(self, a, b):
        # TODO(#2507): Remove after we no longer test against TF 1.x.
        self.assertEqual(a.numpy(), b.numpy())

    def test_lazy_creation_with_memoization(self):
        boxed_count = [0]

        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            boxed_count[0] = boxed_count[0] + 1
            return tf.constant(1)

        self.assertEqual(0, boxed_count[0])
        real_tensor = lazy_tensor()
        self.assertEqual(1, boxed_count[0])
        lazy_tensor()
        self.assertEqual(1, boxed_count[0])

    def test_conversion_explicit(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1)

        real_tensor = tf.convert_to_tensor(lazy_tensor)
        self.assertEqualAsNumpy(tf.constant(1), real_tensor)

    def test_conversion_identity(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1)

        real_tensor = tf.identity(lazy_tensor)
        self.assertEqualAsNumpy(tf.constant(1), real_tensor)

    def test_conversion_implicit(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1)

        real_tensor = lazy_tensor + tf.constant(1)
        self.assertEqualAsNumpy(tf.constant(2), real_tensor)

    def test_explicit_dtype_okay_if_matches(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1, dtype=tf.int32)

        real_tensor = tf.convert_to_tensor(lazy_tensor, dtype=tf.int32)
        self.assertEqual(tf.int32, real_tensor.dtype)
        self.assertEqualAsNumpy(tf.constant(1, dtype=tf.int32), real_tensor)

    def test_explicit_dtype_rejected_if_different(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1, dtype=tf.int32)

        with self.assertRaisesRegex(RuntimeError, "dtype"):
            tf.convert_to_tensor(lazy_tensor, dtype=tf.int64)

    def test_as_ref_rejected(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return tf.constant(1, dtype=tf.int32)

        with self.assertRaisesRegex(RuntimeError, "ref tensor"):
            # Call conversion routine manually since this isn't actually
            # exposed as an argument to tf.convert_to_tensor.
            lazy_tensor_creator._lazy_tensor_creator_converter(
                lazy_tensor, as_ref=True
            )

    def test_reentrant_callable_does_not_deadlock(self):
        @lazy_tensor_creator.LazyTensorCreator
        def lazy_tensor():
            return lazy_tensor()

        with self.assertRaisesRegex(RuntimeError, "reentrant callable"):
            lazy_tensor()


if __name__ == "__main__":
    tf.test.main()
