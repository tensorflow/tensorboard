#!/bin/sh
set -eux
cd "$(mktemp -d)"

>empty.cc
! gcc -fcolor-diagnostics -o /dev/null ./empty.cc 2>&1 >/dev/null
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

"${1-bazel}" version
"${1-bazel}" run :hello
