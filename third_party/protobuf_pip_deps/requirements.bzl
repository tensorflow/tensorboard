"""Minimal pip dependency shim for protobuf's Bazel build."""

def requirement(name):
    if name == "numpy":
        return "@org_tensorflow_tensorboard//tensorboard:expect_numpy_installed"
    if name == "setuptools":
        return "@protobuf_pip_deps_setuptools//:site_packages"
    fail("Unsupported protobuf pip dependency: %s" % name)

def install_deps():
    return None
