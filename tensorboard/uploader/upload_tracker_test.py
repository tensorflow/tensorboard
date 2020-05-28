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
"""Tests for tensorboard.uploader.upload_tracker."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from unittest import mock

import tqdm

from tensorboard import test as tb_test
from tensorboard.uploader import upload_tracker


class ReadableBytesStringTest(tb_test.TestCase):
    def testZero(self):
        self.assertEqual(upload_tracker.readable_bytes_string(0), "0 B")

    def testLessThan1K(self):
        self.assertEqual(upload_tracker.readable_bytes_string(42), "42 B")

    def testBetween1KAnd1M(self):
        self.assertEqual(upload_tracker.readable_bytes_string(1337), "1.3 kB")

    def testMoreThan1M(self):
        self.assertEqual(
            upload_tracker.readable_bytes_string(299792458), "285.9 MB"
        )


class UploadStatsTest(tb_test.TestCase):
    """Unit tests for the UploadStats class."""

    def testAddScalar(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        self.assertEqual(stats.num_scalars, 1234)
        stats.add_scalars(4321)
        self.assertEqual(stats.num_scalars, 5555)

    def testAddTensor(self):
        stats = upload_tracker.UploadStats()
        stats.add_tensors(
            num_tensors=10,
            num_tensors_skipped=0,
            tensor_bytes=1000,
            tensor_bytes_skipped=0,
        )
        self.assertEqual(stats.num_tensors, 10)
        self.assertEqual(stats.num_tensors_skipped, 0)
        self.assertEqual(stats.tensor_bytes, 1000)
        self.assertEqual(stats.tensor_bytes_skipped, 0)
        stats.add_tensors(
            num_tensors=20,
            num_tensors_skipped=5,
            tensor_bytes=2000,
            tensor_bytes_skipped=500,
        )
        self.assertEqual(stats.num_tensors, 30)
        self.assertEqual(stats.num_tensors_skipped, 5)
        self.assertEqual(stats.tensor_bytes, 3000)
        self.assertEqual(stats.tensor_bytes_skipped, 500)

    def testAddTensorsNumTensorsSkippedGreaterThanNumTenosrsErrors(self):
        stats = upload_tracker.UploadStats()
        with self.assertRaises(AssertionError):
            stats.add_tensors(
                num_tensors=10,
                num_tensors_skipped=12,
                tensor_bytes=1000,
                tensor_bytes_skipped=0,
            )

    def testAddTensorsNumTensorsSkippedGreaterThanNumTenosrsErrors(self):
        stats = upload_tracker.UploadStats()
        with self.assertRaises(AssertionError):
            stats.add_tensors(
                num_tensors=10,
                num_tensors_skipped=12,
                tensor_bytes=1000,
                tensor_bytes_skipped=0,
            )

    def testAddBlob(self):
        stats = upload_tracker.UploadStats()
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        self.assertEqual(stats.blob_bytes, 1000)
        self.assertEqual(stats.blob_bytes_skipped, 0)
        stats.add_blob(blob_bytes=2000, is_skipped=True)
        self.assertEqual(stats.blob_bytes, 3000)
        self.assertEqual(stats.blob_bytes_skipped, 2000)

    def testAddPlugin(self):
        stats = upload_tracker.UploadStats()
        stats.add_plugin("scalars")
        self.assertEqual(stats.plugin_names, set(["scalars"]))
        stats.add_plugin("scalars")
        self.assertEqual(stats.plugin_names, set(["scalars"]))
        stats.add_plugin("histograms")
        self.assertEqual(stats.plugin_names, set(["histograms", "scalars"]))

    def testUploadedSummaryWithTensorsAndBlobs(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        stats.add_tensors(
            num_tensors=50,
            num_tensors_skipped=10,
            tensor_bytes=2000,
            tensor_bytes_skipped=1800,
        )
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        stats.add_blob(blob_bytes=2000, is_skipped=True)
        self.assertEqual(
            stats.uploaded_summary,
            "1234 scalars, 40 tensors (200 B), 1 binary objects (1000 B)",
        )

    def testUploadedSummaryWithoutTensorsOrBLobs(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        self.assertEqual(
            stats.uploaded_summary, "1234 scalars, 0 tensors, 0 binary objects",
        )

    def testSkippedAnyReturnsFalse(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        stats.add_tensors(
            num_tensors=50,
            num_tensors_skipped=0,
            tensor_bytes=2000,
            tensor_bytes_skipped=0,
        )
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        self.assertFalse(stats.skipped_any)

    def testSkippedAnyReturnsTrue(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        stats.add_tensors(
            num_tensors=50,
            num_tensors_skipped=10,
            tensor_bytes=2000,
            tensor_bytes_skipped=1800,
        )
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        stats.add_blob(blob_bytes=2000, is_skipped=True)
        self.assertTrue(stats.skipped_any)

    def testSkippedSummary(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        stats.add_tensors(
            num_tensors=50,
            num_tensors_skipped=10,
            tensor_bytes=2000,
            tensor_bytes_skipped=1800,
        )
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        stats.add_blob(blob_bytes=2000, is_skipped=True)
        self.assertEqual(
            stats.skipped_summary,
            "10 tensors (1.8 kB), 1 binary objects (2.0 kB)",
        )


class UploadTrackerTest(tb_test.TestCase):
    """Test for the UploadTracker class."""

    def setUp(self):
        self.cumulative_bar = mock.MagicMock()
        self.skipped_bar = mock.MagicMock()
        self.uploading_bar = mock.MagicMock()
        self.fake_tqdm = mock.MagicMock(
            side_effect=[
                self.cumulative_bar,
                self.skipped_bar,
                self.uploading_bar,
            ]
        )

    def testSendTracker(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.send_tracker():
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Data upload starting...",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
            self.assertEqual(
                self.uploading_bar.set_description_str.call_count, 2
            )
            self.assertIn(
                "Listening for new data in logdir...",
                self.uploading_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.uploading_bar.update.call_count, 2)
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 0
            )
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 0
            )
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 0)

    def testScalarsTracker(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.scalars_tracker(123):
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Uploading 123 scalars...",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
                self.assertEqual(
                    self.cumulative_bar.set_description_str.call_count, 0
                )
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 1
            )
            self.assertIn(
                "Uploaded 123 scalars, 0 tensors, 0 binary objects",
                self.cumulative_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.cumulative_bar.update.call_count, 1)
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 0)

    def testTensorsTrackerWithSkippedTensors(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.tensors_tracker(
                num_tensors=200,
                num_tensors_skipped=50,
                tensor_bytes=6000,
                tensor_bytes_skipped=4000,
            ):
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Uploading 150 tensors (2.0 kB) (Skipping 50 tensors, 3.9 kB)",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
                self.assertEqual(
                    self.cumulative_bar.set_description_str.call_count, 0
                )
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 1
            )
            self.assertIn(
                "Uploaded 0 scalars, 150 tensors (2.0 kB), 0 binary objects",
                self.cumulative_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.cumulative_bar.update.call_count, 1)
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 1)
            self.assertIn(
                "Skipped 50 tensors (3.9 kB)",
                self.skipped_bar.set_description_str.call_args[0][0],
            )

    def testTensorsTrackerWithoutSkippedTensors(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.tensors_tracker(
                num_tensors=200,
                num_tensors_skipped=0,
                tensor_bytes=6000,
                tensor_bytes_skipped=0,
            ):
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Uploading 200 tensors (5.9 kB)",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
                self.assertEqual(
                    self.cumulative_bar.set_description_str.call_count, 0
                )
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 1
            )
            self.assertIn(
                "Uploaded 0 scalars, 200 tensors (5.9 kB), 0 binary objects",
                self.cumulative_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.cumulative_bar.update.call_count, 1)
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 0)

    def testBlobTrackerUploaded(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.blob_tracker(blob_bytes=2048) as blob_tracker:
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Uploading binary object (2.0 kB)",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
                self.assertEqual(
                    self.cumulative_bar.set_description_str.call_count, 0
                )
                blob_tracker.mark_uploaded(is_uploaded=True)
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 1
            )
            self.assertIn(
                "Uploaded 0 scalars, 0 tensors, 1 binary objects (2.0 kB)",
                self.cumulative_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.cumulative_bar.update.call_count, 1)
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 0)

    def testBlobTrackerNotUploaded(self):
        with mock.patch.object(tqdm, "tqdm", self.fake_tqdm):
            tracker = upload_tracker.UploadTracker()
            with tracker.blob_tracker(
                blob_bytes=2048 * 1024 * 1024
            ) as blob_tracker:
                self.assertEqual(
                    self.uploading_bar.set_description_str.call_count, 1
                )
                self.assertIn(
                    "Uploading binary object (2048.0 MB)",
                    self.uploading_bar.set_description_str.call_args[0][0],
                )
                self.assertEqual(self.uploading_bar.update.call_count, 1)
                self.assertEqual(
                    self.cumulative_bar.set_description_str.call_count, 0
                )
                blob_tracker.mark_uploaded(is_uploaded=False)
            self.assertEqual(
                self.cumulative_bar.set_description_str.call_count, 1
            )
            self.assertIn(
                "Uploaded 0 scalars, 0 tensors, 0 binary objects",
                self.cumulative_bar.set_description_str.call_args[0][0],
            )
            self.assertEqual(self.cumulative_bar.update.call_count, 1)
            self.assertEqual(self.skipped_bar.set_description_str.call_count, 1)
            self.assertIn(
                "Skipped 1 binary objects (2048.0 MB)",
                self.skipped_bar.set_description_str.call_args[0][0],
            )


if __name__ == "__main__":
    tb_test.main()
