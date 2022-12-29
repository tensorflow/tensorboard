# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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


import sys

from unittest import mock

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

    def testHasNewDataSinceLastSummarizeReturnsFalseInitially(self):
        stats = upload_tracker.UploadStats()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)

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
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)
        uploaded_summary, skipped_summary = stats.summarize()
        self.assertEqual(
            uploaded_summary,
            "1234 scalars, 40 tensors (200 B), 1 binary objects (1000 B)",
        )
        self.assertEqual(
            skipped_summary,
            "10 tensors (1.8 kB), 1 binary objects (2.0 kB)",
        )
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)

    def testSummarizeeWithoutTensorsOrBlobs(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1234)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)
        (uploaded_summary, skipped_summary) = stats.summarize()
        self.assertEqual(
            uploaded_summary,
            "1234 scalars, 0 tensors, 0 binary objects",
        )
        self.assertIsNone(skipped_summary)
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)

    def testHasNewDataSinceLastSummarizeReturnsTrueAfterNewScalars(self):
        stats = upload_tracker.UploadStats()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_scalars(1234)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)
        stats.summarize()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_scalars(4321)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)

    def testHasNewDataSinceLastSummarizeReturnsTrueAfterNewTensors(self):
        stats = upload_tracker.UploadStats()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_scalars(1234)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)
        stats.summarize()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_tensors(
            num_tensors=10,
            num_tensors_skipped=10,
            tensor_bytes=1000,
            tensor_bytes_skipped=1000,
        )
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)

    def testHasNewDataSinceLastSummarizeReturnsTrueAfterNewBlob(self):
        stats = upload_tracker.UploadStats()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_scalars(1234)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)
        stats.summarize()
        self.assertEqual(stats.has_new_data_since_last_summarize(), False)
        stats.add_blob(blob_bytes=2000, is_skipped=True)
        self.assertEqual(stats.has_new_data_since_last_summarize(), True)

    def testHasDataInitiallyReturnsFalse(self):
        stats = upload_tracker.UploadStats()
        self.assertEqual(stats.has_data(), False)

    def testHasDataReturnsTrueWithScalars(self):
        stats = upload_tracker.UploadStats()
        stats.add_scalars(1)
        self.assertEqual(stats.has_data(), True)

    def testHasDataReturnsTrueWithUnskippedTensors(self):
        stats = upload_tracker.UploadStats()
        stats.add_tensors(
            num_tensors=10,
            num_tensors_skipped=0,
            tensor_bytes=1000,
            tensor_bytes_skipped=0,
        )
        self.assertEqual(stats.has_data(), True)

    def testHasDataReturnsTrueWithSkippedTensors(self):
        stats = upload_tracker.UploadStats()
        stats.add_tensors(
            num_tensors=10,
            num_tensors_skipped=10,
            tensor_bytes=1000,
            tensor_bytes_skipped=1000,
        )
        self.assertEqual(stats.has_data(), True)

    def testHasDataReturnsTrueWithUnskippedBlob(self):
        stats = upload_tracker.UploadStats()
        stats.add_blob(blob_bytes=1000, is_skipped=False)
        self.assertEqual(stats.has_data(), True)

    def testHasDataReturnsTrueWithSkippedBlob(self):
        stats = upload_tracker.UploadStats()
        stats.add_blob(blob_bytes=1000, is_skipped=True)
        self.assertEqual(stats.has_data(), True)


class UploadTrackerTest(tb_test.TestCase):
    """Test for the UploadTracker class."""

    def setUp(self):
        super().setUp()
        self.cumulative_bar = mock.MagicMock()
        self.skipped_bar = mock.MagicMock()
        self.uploading_bar = mock.MagicMock()
        self.mock_write = mock.MagicMock()
        self.mock_stdout_write = mock.patch.object(
            sys.stdout, "write", self.mock_write
        )
        self.mock_stdout_write.start()
        self.mock_flush = mock.MagicMock()
        self.mock_stdout_flush = mock.patch.object(
            sys.stdout, "flush", self.mock_flush
        )
        self.mock_stdout_flush.start()

    def tearDown(self):
        self.mock_stdout_write.stop()
        self.mock_stdout_flush.stop()
        super().tearDown()

    def testSendTracker(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.send_tracker():
            self.assertEqual(self.mock_write.call_count, 2)
            self.assertEqual(self.mock_flush.call_count, 2)
            self.assertIn(
                "Data upload starting...",
                self.mock_write.call_args[0][0],
            )
        self.assertEqual(self.mock_write.call_count, 3)
        self.assertEqual(self.mock_flush.call_count, 3)
        self.assertIn(
            "Listening for new data in logdir...",
            self.mock_write.call_args[0][0],
        )
        self.assertEqual(tracker.has_data(), False)

    def testSendTrackerWithVerbosity0(self):
        tracker = upload_tracker.UploadTracker(verbosity=0)
        with tracker.send_tracker():
            self.assertEqual(self.mock_write.call_count, 0)
            self.assertEqual(self.mock_flush.call_count, 0)
        self.assertEqual(self.mock_write.call_count, 0)
        self.assertEqual(self.mock_flush.call_count, 0)

    def testScalarsTracker(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.scalars_tracker(123):
            self.assertEqual(self.mock_write.call_count, 1)
            self.assertEqual(self.mock_flush.call_count, 1)
            self.assertIn(
                "Uploading 123 scalars...",
                self.mock_write.call_args[0][0],
            )
        self.assertEqual(self.mock_write.call_count, 1)
        self.assertEqual(self.mock_flush.call_count, 1)
        self.assertEqual(tracker.has_data(), True)

    def testScalarsTrackerWithVerbosity0(self):
        tracker = upload_tracker.UploadTracker(verbosity=0)
        with tracker.scalars_tracker(123):
            self.assertEqual(self.mock_write.call_count, 0)
            self.assertEqual(self.mock_flush.call_count, 0)
        self.assertEqual(self.mock_write.call_count, 0)
        self.assertEqual(self.mock_flush.call_count, 0)

    def testTensorsTrackerWithSkippedTensors(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.tensors_tracker(
            num_tensors=200,
            num_tensors_skipped=50,
            tensor_bytes=6000,
            tensor_bytes_skipped=4000,
        ):
            self.assertEqual(self.mock_write.call_count, 1)
            self.assertEqual(self.mock_flush.call_count, 1)
            self.assertIn(
                "Uploading 150 tensors (2.0 kB) (Skipping 50 tensors, 3.9 kB)",
                self.mock_write.call_args[0][0],
            )
        self.assertEqual(tracker.has_data(), True)

    def testTensorsTrackerWithVerbosity0(self):
        tracker = upload_tracker.UploadTracker(verbosity=0)
        with tracker.tensors_tracker(
            num_tensors=200,
            num_tensors_skipped=50,
            tensor_bytes=6000,
            tensor_bytes_skipped=4000,
        ):
            self.assertEqual(self.mock_write.call_count, 0)
            self.assertEqual(self.mock_flush.call_count, 0)
        self.assertEqual(self.mock_write.call_count, 0)
        self.assertEqual(self.mock_flush.call_count, 0)

    def testTensorsTrackerWithoutSkippedTensors(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.tensors_tracker(
            num_tensors=200,
            num_tensors_skipped=0,
            tensor_bytes=6000,
            tensor_bytes_skipped=0,
        ):
            self.assertEqual(self.mock_write.call_count, 1)
            self.assertEqual(self.mock_flush.call_count, 1)
            self.assertIn(
                "Uploading 200 tensors (5.9 kB)",
                self.mock_write.call_args[0][0],
            )
        self.assertEqual(tracker.has_data(), True)

    def testBlobTrackerUploaded(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.blob_tracker(blob_bytes=2048) as blob_tracker:
            self.assertEqual(self.mock_write.call_count, 1)
            self.assertEqual(self.mock_flush.call_count, 1)
            self.assertIn(
                "Uploading binary object (2.0 kB)",
                self.mock_write.call_args[0][0],
            )

    def testBlobTrackerWithVerbosity0(self):
        tracker = upload_tracker.UploadTracker(verbosity=0)
        with tracker.blob_tracker(blob_bytes=2048):
            self.assertEqual(self.mock_write.call_count, 0)
            self.assertEqual(self.mock_flush.call_count, 0)
        self.assertEqual(self.mock_write.call_count, 0)
        self.assertEqual(self.mock_flush.call_count, 0)

    def testBlobTrackerNotUploaded(self):
        tracker = upload_tracker.UploadTracker(verbosity=1)
        with tracker.send_tracker():
            self.assertEqual(self.mock_write.call_count, 2)
            self.assertEqual(self.mock_flush.call_count, 2)
            self.assertIn(
                "Started scanning",
                self.mock_write.call_args_list[0][0][0],
            )
            with tracker.blob_tracker(
                blob_bytes=2048 * 1024 * 1024
            ) as blob_tracker:
                self.assertEqual(self.mock_write.call_count, 3)
                self.assertEqual(self.mock_flush.call_count, 3)
                self.assertIn(
                    "Uploading binary object (2048.0 MB)",
                    self.mock_write.call_args[0][0],
                )
                blob_tracker.mark_uploaded(is_uploaded=False)
        self.assertEqual(self.mock_write.call_count, 6)
        self.assertEqual(self.mock_flush.call_count, 5)
        self.assertIn(
            "Total uploaded: 0 scalars, 0 tensors, 0 binary objects\n",
            self.mock_write.call_args_list[3][0][0],
        )
        self.assertIn(
            "Total skipped: 1 binary objects (2048.0 MB)\n",
            self.mock_write.call_args_list[4][0][0],
        )
        self.assertEqual(tracker.has_data(), True)

    def testInvalidVerbosityRaisesError(self):
        with self.assertRaises(ValueError):
            upload_tracker.UploadTracker(verbosity="1")
        with self.assertRaises(ValueError):
            upload_tracker.UploadTracker(verbosity=-1)
        with self.assertRaises(ValueError):
            upload_tracker.UploadTracker(verbosity=0.5)
        with self.assertRaises(ValueError):
            upload_tracker.UploadTracker(verbosity=100)
        with self.assertRaises(ValueError):
            upload_tracker.UploadTracker(verbosity=None)


if __name__ == "__main__":
    tb_test.main()
