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
        "//tensorboard",  # Main tensorboard binary and everything it uses
        "//tensorboard:lib",  # User-facing overall TensorBoard API
        "//tensorboard:version",  # Version module (read by setup.py)
        "//tensorboard/plugins/beholder",  # User-facing beholder API
        "//tensorboard/plugins/projector",  # User-facing projector API
    ],
)
