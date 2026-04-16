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

What is special about this copy:

- It is used as a local Bazel repository via `WORKSPACE`.
- It is intended to satisfy the Closure / Soy Java dependency graph during the
  migration, not to change TensorBoard's Python/runtime behavior directly.
- Some files in this tree were adjusted so the Java code works with the newer
  protobuf APIs expected by this branch's toolchain.

Reviewer note:

Most of the line-count increase in this PR comes from this vendored directory.
The functional Bazel/TensorBoard migration logic is concentrated in:

- `WORKSPACE`
- `.bazelrc`
- `tensorboard/defs/protos.bzl`
- `tensorboard/compat/BUILD`
- `tensorboard/pip_package/test_pip_package.sh`
