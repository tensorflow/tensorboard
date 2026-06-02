"""Minimal pip dependency shim for protobuf's Bazel build.

Protobuf's Bazel macros load a pip-style requirements helper that provides
`requirement()` and `install_deps()`. TensorBoard only needs a very small
subset of that surface here, so this file supplies just the labels
protobuf 6.31.1 actually asks for here:

* `install_deps()` from protobuf's WORKSPACE setup
* `requirement("setuptools")` from `python/dist/BUILD.bazel`
* `requirement("numpy")` from protobuf's numpy test target
"""

def requirement(name):
    """Returns the Bazel label for a protobuf pip dependency used here."""
    if name == "numpy":
        return "@org_tensorflow_tensorboard//tensorboard:expect_numpy_installed"
    if name == "setuptools":
        return "@protobuf_pip_deps_setuptools//:site_packages"
    fail("Unsupported protobuf pip dependency: %s" % name)

def install_deps():
    """Compatibility no-op for protobuf's WORKSPACE dependency hook."""
    return None
