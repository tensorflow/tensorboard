#!/bin/sh
set -eux
cd "$(mktemp -d)"

describe_status() {
    last_status=0
    "$@" || last_status=$?
    printf >&3 'exited with: %s\n' "${last_status}"
}

>empty.cc
describe_status gcc -fcolor-diagnostics -o /dev/null ./empty.cc 2>&1 3>&1 >/dev/null
rm -f ./empty.cc

>WORKSPACE

cat >hello.cc <<EOF
#include <iostream>
int main(int argc, char **argv) {
    std::cout << "Hello World!\n";
    return 0;
}
EOF

cat >BUILD <<EOF
cc_binary(
    name = "hello",
    srcs = ["hello.cc"],
)
EOF

describe_status "${1-bazel}" run :hello 3>&1
