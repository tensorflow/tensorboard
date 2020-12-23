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

# """Tests for EventFileWriter and _AsyncWriter"""


import boto3
import os
import unittest
from tensorboard.summary.writer.event_file_writer import EventFileWriter
from tensorboard.compat import tf
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.compat.tensorflow_stub.io import gfile
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import (
    PyRecordReader_New,
)
from moto import mock_s3
from tensorboard import test as tb_test

# Placeholder values to make sure any local keys are overridden
# and moto mock is being called
os.environ.setdefault("AWS_ACCESS_KEY_ID", "foobar_key")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "foobar_secret")

USING_REAL_TF = tf.__version__ != "stub"


def s3_temp_dir(
    top_directory="top_dir", bucket_name="test", region_name="us-east-1"
):
    """Creates a test S3 bucket and returns directory location.

    Args:
      top_directory: The path of the top level S3 directory in which
        to create the directory structure. Defaults to 'top_dir'.
      bucket_name: The S3 bucket name. Defaults to 'test'.
      region_name: The S3 region name. Defaults to 'us-east-1'.

    Returns S3 URL of the top directory in the form 's3://bucket/path'
    """
    s3_url = "s3://{}/{}".format(bucket_name, top_directory)
    client = boto3.client("s3", region_name=region_name)
    client.create_bucket(Bucket=bucket_name)
    return s3_url


def s3_join(*args):
    """Joins an S3 directory path as a replacement for os.path.join."""
    return "/".join(args)


class EventFileWriterTest(tb_test.TestCase):
    @unittest.skipIf(USING_REAL_TF, "Test only passes when using stub TF")
    @mock_s3
    def test_event_file_writer_roundtrip(self):
        _TAGNAME = "dummy"
        _DUMMY_VALUE = 42
        logdir = s3_temp_dir()
        w = EventFileWriter(logdir)
        summary = Summary(
            value=[Summary.Value(tag=_TAGNAME, simple_value=_DUMMY_VALUE)]
        )
        fakeevent = event_pb2.Event(summary=summary)
        w.add_event(fakeevent)
        w.close()
        event_files = sorted(gfile.glob(s3_join(logdir, "*")))
        self.assertEqual(len(event_files), 1)
        r = PyRecordReader_New(event_files[0])
        r.GetNext()  # meta data, so skip
        r.GetNext()
        self.assertEqual(fakeevent.SerializeToString(), r.record())

    @unittest.skipIf(USING_REAL_TF, "Test only passes when using stub TF")
    @mock_s3
    def test_setting_filename_suffix_works(self):
        logdir = s3_temp_dir()

        w = EventFileWriter(logdir, filename_suffix=".event_horizon")
        w.close()
        event_files = sorted(gfile.glob(s3_join(logdir, "*")))
        self.assertEqual(event_files[0].split(".")[-1], "event_horizon")


if __name__ == "__main__":
    tb_test.main()
