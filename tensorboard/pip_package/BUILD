# Description:
#  Tools for building the TensorBoard pip package.

package(default_visibility = ["//visibility:private"])

licenses(["notice"])  # Apache 2.0

sh_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.sh"],
    data = [
        "LICENSE",
        "MANIFEST.in",
        "README.rst",
        "setup.cfg",
        "setup.py",
        # Main tensorboard binary and everything it uses
        "//tensorboard",
        # User-facing python library ('import tensorboard')
        "//tensorboard:lib",
        # Version module (read by setup.py)
        "//tensorboard:version",
        # User-facing projector API ('import tensorboard.plugins.projector')
        "//tensorboard/plugins/projector",
    ],
)
