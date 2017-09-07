# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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

from google.cloud import spanner

import datetime

from tensorboard import db
from tensorboard import spanner as tb_spanner
import tensorflow as tf
import unittest

CODE_ALREADY_EXISTS = 409

# TODO(jlewi): This is an E2E test. Need to figure out proper way to run it and also
# to create unittests.
#class CloudSpannerTest(tf.test.TestCase):
#def testE2e(self):
def testE2e():
  project = "cloud-ml-dev"
  instance_name = "jlewi-tb"

  # Use a unique DB on each test run.
  now = datetime.datetime.now()
  database_name = "tb-test-{0}".format(now.strftime("%Y%m%d-%H%M%S"))

  client = spanner.Client(project)
  # TODO(jlewi): Should we specify parameters like region and nodes?
  config_name = "projects/{0}/instanceConfigs/regional-us-central1".format(project)
  instance = client.instance(instance_name, configuration_name=config_name,
                             node_count=3, display_name="Spanner instance for jlewi@.")
  try:
    op = instance.create()
    # TODO(jlewi): Wait for op to complete.
  except Exception as e:
    if e.code == CODE_ALREADY_EXISTS:
      # Do nothing since the instance already exists.
      pass
    else:
      raise e
    # e.get
  # TODO(jlewi): Wait for operation to complete.

  conn = tb_spanner.CloudSpannerConnection(project, instance_name, database_name)
  schema = tb_spanner.CloudSpannerSchema(conn)

  schema.create_tables()

if __name__ == "__main__":
  # DO NOT SUBMIT. Running the unittest interferes with how wingide breaks
  # on exceptions.
  #tf.test.main()
  testE2e()