#!/bin/bash

exit_code=0

DOCS_DIR="${TEST_SRCDIR}/org_tensorflow_tensorboard/docs/"
ipynbs="$(find $DOCS_DIR -iname *.ipynb)"
bad_files=()

# Check whether ipynb have the right JSON format.
for ipynb in $ipynbs; do
  jq . "$ipynb" >/dev/null 2>&1
  code=$?

  if [[ code -gt 0 ]]; then
    bad_files+=("$ipynb")
  fi

  exit_code=$((exit_code + $code))
done

printf '%s\n' "${bad_files[@]}"
exit $exit_code
