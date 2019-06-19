#!/usr/bin/python
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

"""Check for superfluous whitespace at ends of lines.

Keeps diffs clean and persnickety developers happy.
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import os
import subprocess
import sys


# Remove files from this list as whitespace errors are fixed.
exceptions = frozenset([
    "README.md",
    "docs/r1/overview.md",
    "tensorboard/components/tf_color_scale/palettes.ts",
    "tensorboard/plugins/custom_scalar/tf_custom_scalar_dashboard/tf-custom-scalar-dashboard.html",
    "tensorboard/plugins/debugger/tf_debugger_dashboard/tf-debugger-resizer.html",
    "tensorboard/plugins/graph/tf_graph_common/edge.ts",
    "tensorboard/plugins/hparams/api.d.ts",
    "tensorboard/plugins/hparams/http_api.md",
    "tensorboard/plugins/hparams/tf_hparams_google_analytics_tracker/test/tf-hparams-google-analytics-tracker-test.html",
    "tensorboard/plugins/hparams/tf_hparams_parallel_coords_plot/tf-hparams-parallel-coords-plot.html",
    "tensorboard/plugins/hparams/tf_hparams_sessions_pane/tf-hparams-sessions-pane.html",
    "tensorboard/plugins/interactive_inference/witwidget/BUILD",
    "tensorboard/plugins/interactive_inference/witwidget/pip_package/BUILD",
    "tensorboard/plugins/interactive_inference/witwidget/pip_package/RELEASE.md",
    "tensorboard/plugins/mesh/BUILD",
    "tensorboard/plugins/mesh/README.md",
    "tensorboard/plugins/mesh/http_api.md",
    "tensorboard/plugins/mesh/mesh_plugin_test.py",
    "tensorboard/plugins/mesh/metadata_test.py",
    "tensorboard/plugins/mesh/summary_test.py",
    "tensorboard/plugins/mesh/test_utils.py",
    "tensorboard/plugins/pr_curve/http_api.md",
    "tensorboard/plugins/profile/README.md",
    "tensorboard/plugins/profile/pod_viewer/stack_bar_chart/stack-bar-chart.ts",
    "tensorboard/plugins/projector/vz_projector/umap.d.ts",
    "tensorboard/plugins/projector/vz_projector/util.ts",
    "tensorboard/plugins/projector/vz_projector/vz-projector-inspector-panel.ts",
    "tensorboard/plugins/projector/vz_projector/vz-projector-metadata-card.html",
    "tensorboard/plugins/projector/vz_projector/vz-projector-projections-panel.html",
    "tensorboard/plugins/projector/vz_projector/vz-projector-projections-panel.ts",
    "tensorboard/plugins/projector/vz_projector/vz-projector.ts",
    "tensorboard/program_test.py",
    "tensorboard/tools/docs_list_format_test.sh",
])


Match = collections.namedtuple("Match", ("filename", "line_number", "line"))


def main():
  chdir_to_repo_root()
  matches = git_grep("  *$")
  errors = [m for m in matches if m.filename not in exceptions]
  okay = True

  if errors:
    print("Superfluous trailing whitespace:")
    for error in errors:
      print("%s:%d:%s$" % (error.filename, error.line_number, error.line))
    print()
    okay = False

  stale_exceptions = exceptions - frozenset(m.filename for m in matches)
  if stale_exceptions:
    print("Stale exceptions (no whitespace problems; prune exceptions list):")
    for filename in stale_exceptions:
      print(filename)
    print()
    okay = False

  sys.exit(0 if okay else 1)


def git_grep(pattern):
  """Run `git grep` and collect matches.

  This function exits the process if `git grep` writes any stderr: for
  instance, if the provided pattern is an invalid regular expression.

  Args:
    pattern: `str`; a pattern argument to `git grep`.

  Returns:
    A list of `Match` values.
  """
  cmd = ["git", "grep", "-Izn", "--", pattern]
  p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  (stdout, stderr) = p.communicate()
  if stderr:
    getattr(sys.stderr, "buffer", sys.stderr).write(stderr)  # Python 2 compat
    sys.exit(1)
  result = []
  for line in stdout.splitlines():  # assumes no newline characters in filenames
    (filename_raw, line_number_raw, line_raw) = line.split(b"\0", 2)
    match = Match(
        filename=filename_raw.decode("utf-8", errors="replace"),
        line_number=int(line_number_raw),
        line=line_raw.decode("utf-8", errors="replace"),
    )
    result.append(match)
  return result


def chdir_to_repo_root():
  toplevel = subprocess.check_output(["git", "rev-parse", "--show-toplevel"])
  toplevel = toplevel[:-1]  # trim trailing LF
  os.chdir(toplevel)


if __name__ == "__main__":
  main()
