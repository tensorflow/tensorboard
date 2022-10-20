#!/bin/bash

# DO_NOT_SUBMIT
if [[ "$1" == 'test' ]]; then
  echo "Running Tests"
  OUTPUT=$(bazel test //tensorboard/...)
elif [[ "$1" == 'dev' ]]; then
  echo "Running Dev Server" 
  COMMAND="ibazel run tensorboard:dev ${@:2}"
  echo "Generated Command $COMMAND"
  $COMMAND
fi

echo $OUTPUT

if [[ "$GITHUB_OUTPUT" != '' ]]; then
  echo "output=$OUTPUT" >> $GITHUB_OUTPUT
fi
