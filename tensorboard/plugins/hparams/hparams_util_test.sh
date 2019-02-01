#!/bin/bash
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
hparam_infos:{
  name: "learning_rate"
  display_name: "learning_rate"
  type:DATA_TYPE_STRING
  domain_discrete: {
    values: { string_value:"1e-3" }
    values: { string_value:"1e-4" }
  }
}
hparam_infos: {
  name: "num_keypoints"
  display_name: "num_keypoints"
  type: DATA_TYPE_STRING
  domain_discrete: {
     values: {string_value:"100" }
     values: {string_value:"200" }
  }
}' \
  --metric_infos='
metric_infos:{
  name:{
    group:"/eval_train"
    tag:"loss"
  }
  display_name:
    "eval_train/loss"
}
metric_infos:{
  name:{
     group:"/eval_test"
     tag:"loss"
  }
  display_name:"eval_test/loss"
}
metric_infos:{
  name:{
     group:"/eval_train"
     tag:"accuracy"
  }
  display_name:"eval_train/accuracy"
}' \
--description="" \
--action=create_experiment || die "Failed in action 'create_experiment'."

# Test --action=end_session
"${BINARY}" \
--logdir="${LOGDIR}" \
--action=end_session \
--status=STATUS_SUCCESS  || die "Failed in action 'end_session'."

