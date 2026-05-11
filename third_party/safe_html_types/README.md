# safe_html_types vendor note

This directory vendors the Java `com.google.common.html.types` classes needed by
TensorBoard's existing Closure / Soy toolchain during the Bazel 7.7.0 and
protobuf 6.31.1 migration.

Why this exists:

- TensorBoard still uses `rules_closure` / Soy tooling in Bazel.
- Upgrading protobuf to `6.31.1` exposed Java-side incompatibilities in the
  older transitive safe-html-types classes used by that toolchain.
- TensorFlow 2.21 already aligns on protobuf `6.31.1`, so TensorBoard needs a
  Bazel-side path that remains compatible with protobuf-java 6.x as well.

What is vendored here:

- the Java `com.google.common.html.types` source files
- their generated protobuf Java classes
- a minimal Bazel wrapper (`BUILD.bazel`, `WORKSPACE`) so the tree can be used
  as a local repository

What is special about this copy:

- It is used as a local Bazel repository via `WORKSPACE`.
- It is intended to satisfy the Closure / Soy Java dependency graph during the
  migration, not to change TensorBoard's Python/runtime behavior directly.
- Some files in this tree were adjusted so the Java code works with the newer
  protobuf APIs expected by this branch's toolchain.

Why this is safe:

- this code participates in the Bazel Java/Soy build path, not TensorBoard's
  Python runtime or wheel behavior directly
- the branch uses it to replace an older transitive Java dependency with a
  protobuf-6-compatible copy
- the functional TensorBoard changes in this PR live elsewhere; this directory
  is primarily a compatibility dependency for the existing build toolchain

Why this is a local repository instead of an `http_archive` here:

- this branch needs an adjusted protobuf-6-compatible copy of the classes
- the current PR does not yet identify an exact upstream source archive that
  works unchanged with the rest of the Closure/Soy dependency stack
- using a local repository keeps the dependency explicit and reviewable while
  the wider Bazel/protobuf migration is being stabilized

Reviewer note:

Most of the line-count increase in this PR comes from this vendored directory.
The functional Bazel/TensorBoard migration logic is concentrated in:

- `WORKSPACE`
- `.bazelrc`
- `tensorboard/defs/protos.bzl`
- `tensorboard/compat/BUILD`
- `tensorboard/pip_package/test_pip_package.sh`
