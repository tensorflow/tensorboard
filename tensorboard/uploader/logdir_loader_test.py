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
"""Tests for tensorboard.uploader.logdir_loader."""


import os.path
import shutil

from tensorboard.uploader import logdir_loader
from tensorboard import test as tb_test
from tensorboard.backend.event_processing import directory_loader
from tensorboard.backend.event_processing import event_file_loader
from tensorboard.backend.event_processing import io_wrapper
from tensorboard.util import test_util


class LogdirLoaderTest(tb_test.TestCase):
    def _create_logdir_loader(self, logdir):
        def directory_loader_factory(path):
            return directory_loader.DirectoryLoader(
                path,
                event_file_loader.TimestampedEventFileLoader,
                path_filter=io_wrapper.IsTensorFlowEventsFile,
            )

        return logdir_loader.LogdirLoader(logdir, directory_loader_factory)

    def _extract_tags(self, event_generator):
        """Converts a generator of tf.Events into a list of event tags."""
        return [
            event.summary.value[0].tag
            for event in event_generator
            if not event.file_version
        ]

    def _extract_run_to_tags(self, run_to_events):
        """Returns run-to-tags dict from run-to-event-generator dict."""
        run_to_tags = {}
        for run_name, event_generator in run_to_events.items():
            # There should be no duplicate runs.
            self.assertNotIn(run_name, run_to_tags)
            run_to_tags[run_name] = self._extract_tags(event_generator)
        return run_to_tags

    def test_empty_logdir(self):
        logdir = self.get_temp_dir()
        loader = self._create_logdir_loader(logdir)
        # Default state is empty.
        self.assertEmpty(list(loader.get_run_events()))
        loader.synchronize_runs()
        # Still empty, since there's no data.
        self.assertEmpty(list(loader.get_run_events()))

    def test_single_event_logdir(self):
        logdir = self.get_temp_dir()
        with test_util.FileWriter(logdir) as writer:
            writer.add_test_summary("foo")
        loader = self._create_logdir_loader(logdir)
        loader.synchronize_runs()
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()), {".": ["foo"]}
        )
        # A second load should indicate no new data for the run.
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()), {".": []}
        )

    def test_multiple_writes_to_logdir(self):
        logdir = self.get_temp_dir()
        with test_util.FileWriter(os.path.join(logdir, "a")) as writer:
            writer.add_test_summary("tag_a")
        with test_util.FileWriter(os.path.join(logdir, "b")) as writer:
            writer.add_test_summary("tag_b")
        with test_util.FileWriter(os.path.join(logdir, "b", "x")) as writer:
            writer.add_test_summary("tag_b_x")
        writer_c = test_util.FileWriter(os.path.join(logdir, "c"))
        writer_c.add_test_summary("tag_c")
        writer_c.flush()
        loader = self._create_logdir_loader(logdir)
        loader.synchronize_runs()
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()),
            {
                "a": ["tag_a"],
                "b": ["tag_b"],
                "b/x": ["tag_b_x"],
                "c": ["tag_c"],
            },
        )
        # A second load should indicate no new data.
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()),
            {"a": [], "b": [], "b/x": [], "c": []},
        )
        # Write some new data to both new and pre-existing event files.
        with test_util.FileWriter(
            os.path.join(logdir, "a"), filename_suffix=".other"
        ) as writer:
            writer.add_test_summary("tag_a_2")
            writer.add_test_summary("tag_a_3")
            writer.add_test_summary("tag_a_4")
        with test_util.FileWriter(
            os.path.join(logdir, "b", "x"), filename_suffix=".other"
        ) as writer:
            writer.add_test_summary("tag_b_x_2")
        with writer_c as writer:
            writer.add_test_summary("tag_c_2")
        # New data should appear on the next load.
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()),
            {
                "a": ["tag_a_2", "tag_a_3", "tag_a_4"],
                "b": [],
                "b/x": ["tag_b_x_2"],
                "c": ["tag_c_2"],
            },
        )

    def test_directory_deletion(self):
        logdir = self.get_temp_dir()
        with test_util.FileWriter(os.path.join(logdir, "a")) as writer:
            writer.add_test_summary("tag_a")
        with test_util.FileWriter(os.path.join(logdir, "b")) as writer:
            writer.add_test_summary("tag_b")
        with test_util.FileWriter(os.path.join(logdir, "c")) as writer:
            writer.add_test_summary("tag_c")
        loader = self._create_logdir_loader(logdir)
        loader.synchronize_runs()
        self.assertEqual(list(loader.get_run_events().keys()), ["a", "b", "c"])
        shutil.rmtree(os.path.join(logdir, "b"))
        loader.synchronize_runs()
        self.assertEqual(list(loader.get_run_events().keys()), ["a", "c"])
        shutil.rmtree(logdir)
        loader.synchronize_runs()
        self.assertEmpty(loader.get_run_events())

    def test_directory_deletion_during_event_loading(self):
        logdir = self.get_temp_dir()
        with test_util.FileWriter(logdir) as writer:
            writer.add_test_summary("foo")
        loader = self._create_logdir_loader(logdir)
        loader.synchronize_runs()
        self.assertEqual(
            self._extract_run_to_tags(loader.get_run_events()), {".": ["foo"]}
        )
        shutil.rmtree(logdir)
        runs_to_events = loader.get_run_events()
        self.assertEqual(list(runs_to_events.keys()), ["."])
        events = runs_to_events["."]
        self.assertEqual(self._extract_tags(events), [])


if __name__ == "__main__":
    tb_test.main()
