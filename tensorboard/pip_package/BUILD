# Description:
#  Tools for building the TensorBoard pip package.

load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//visibility:private"])

licenses(["notice"])

genrule(
    name = "pip_package",
    # Pip packages are provided in a tarball because we can't statically
    # know the file names: they must contain the TensorBoard version,
    # which is only defined in a Python module. Dependents of this
    # target can extract the tarball and glob its contents.
    outs = ["pip_packages.tar.gz"],
    cmd = "$(execpath :build_pip_package) $@",
    tools = [
        ":build_pip_package",
    ],
    visibility = ["//tensorboard:internal"],
)

sh_binary(
    name = "extract_pip_package",
    srcs = ["extract_pip_package.sh"],
    data = [":pip_package"],
)

sh_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.sh"],
    data = [
        "LICENSE",
        "MANIFEST.in",
        "README.rst",
        "requirements.txt",
        "setup.cfg",
        "setup.py",
        ":deterministic_tar_gz",
        "//tensorboard",  # Main tensorboard binary and everything it uses
        "//tensorboard:lib",  # User-facing overall TensorBoard API
        "//tensorboard:version",  # Version module (read by setup.py)
        "//tensorboard/plugins/hparams",  # User-facing hparams API
        "//tensorboard/plugins/mesh",  #  User-facing mesh API
        "//tensorboard/plugins/projector",  # User-facing projector API
        "//tensorboard/summary:tf_summary",  #  tf.summary API for TF 2.0
    ],
)

# Not an `sh_test`: accepts command-line flags to select Python and
# TensorFlow versions against which to test. Pass `--help` for details.
sh_binary(
    name = "test_pip_package",
    srcs = ["test_pip_package.sh"],
    data = [
        ":pip_package",
    ],
)

py_binary(
    name = "deterministic_tar_gz",
    srcs = ["deterministic_tar_gz.py"],
    srcs_version = "PY3",
)

py_test(
    name = "deterministic_tar_gz_test",
    size = "medium",
    timeout = "short",
    srcs = ["deterministic_tar_gz_test.py"],
    data = [
        ":deterministic_tar_gz",  # invoked as subprocess
    ],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:test",
    ],
)

genrule(
    name = "license",
    srcs = [
        "LICENSE.tensorflow",
        "@npm//:node_modules/d3/LICENSE",
        "@com_google_fonts_roboto//:LICENSE",
        "@org_mozilla_bleach//:LICENSE",
        "@org_html5lib//:LICENSE",
        "@org_pythonhosted_webencodings//:LICENSE",
        "//third_party:bh_tsne.LICENSE",
    ],
    outs = ["LICENSE"],
    cmd = "\n".join([
        "(",
        "  echo '#' TensorBoard License",
        "  echo",
        "  echo TensorBoard is licensed Apache 2.0 and distributed with",
        "  echo vendored content licensed Apache 2.0, MIT, and BSD-3.",
        "  echo",
        "  echo '##' Table of Contents",
        "  echo",
        "  for src in $(SRCS); do",
        "    echo '-' $$src",
        "  done",
        "  echo",
        "  echo '##' Licenses",
        "  for src in $(SRCS); do",
        "    echo",
        "    echo",
        "    echo",
        "    echo '###' $$src",
        "    echo",
        "    cat $$src",
        "  done",
        "",
        ") >$@",
    ]),
)
