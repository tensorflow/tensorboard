#!/bin/bash
#
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
#
# Smoke test for hparams_util.py

# Print message in "$1" then exit with error status 1.
die () {
  local msg=$1
  echo $msg 1>&2
  exit 1
}

# Run binary with various actions and make sure they succeed.
# We currently don't test the actual event file output.
LOGDIR="${TEST_TMPDIR}"/logdir
BINARY="${TEST_SRCDIR}"/org_tensorflow_tensorboard/tensorboard/plugins/hparams/hparams_util

# Test --action=create_experiment
"${BINARY}" \
  --logdir="${LOGDIR}"\
  --hparam_infos='
hparam_infos: {
  name: "learning_rate"
  display_name: "learning_rate"
  type: DATA_TYPE_STRING
  domain_discrete: {
    values: { string_value: "1e-3" }
    values: { string_value: "1e-4" }
  }
}
hparam_infos: {
  name: "num_keypoints"
  display_name: "num_keypoints"
  type: DATA_TYPE_STRING
  domain_discrete: {
     values: { string_value: "100" }
     values: { string_value: "200" }
  }
}' \
  --metric_infos='
metric_infos: {
  name: {
    group: "/eval_train"
    tag: "loss"
  }
  display_name:
    "eval_train/loss"
}
metric_infos: {
  name: {
     group: "/eval_test"
     tag: "loss"
  }
  display_name: "eval_test/loss"
}
metric_infos: {
  name: {
     group: "/eval_train"
     tag: "accuracy"
  }
  display_name: "eval_train/accuracy"
}' \
--description="" \
--action=create_experiment || die "Failed in action 'create_experiment'."

# Test --action=end_session
"${BINARY}" \
--logdir="${LOGDIR}" \
--action=end_session \
--status=STATUS_SUCCESS  || die "Failed in action 'end_session'."

