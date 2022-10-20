#!/bin/sh -l

# DO_NOT_SUBMIT
BAZEL_OUTPUT=$(bazel test //tensorboard/...)

echo message="$BAZEL_OUTPUT" >> $GITHUB_OUTPUT
