"""Minimal pip dependency shim for protobuf's Bazel build.

Protobuf's Bazel macros load a pip-style requirements helper that provides
`requirement()` and `install_deps()`. TensorBoard only needs a very small
subset of that surface on this branch, so this file supplies just the labels
protobuf actually asks for here.
"""

def requirement(name):
    """Returns the Bazel label for a protobuf pip dependency used on this branch."""
    if name == "numpy":
        return "@org_tensorflow_tensorboard//tensorboard:expect_numpy_installed"
    if name == "setuptools":
        return "@protobuf_pip_deps_setuptools//:site_packages"
    fail("Unsupported protobuf pip dependency: %s" % name)

def install_deps():
    """Compatibility no-op for callers that expect an install_deps symbol."""
    return None
