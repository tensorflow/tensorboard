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
# ==============================================================================


from tensorboard import test
from tensorboard.plugins.hparams import api
from tensorboard.plugins.hparams import _keras
from tensorboard.plugins.hparams import summary_v2


class ApiTest(test.TestCase):
    def test_has_core_attributes(self):
        self.assertIs(api.HParam, summary_v2.HParam)

    def test_has_keras_dependent_attributes(self):
        self.assertIs(api.KerasCallback, _keras.Callback)


if __name__ == "__main__":
    test.main()
