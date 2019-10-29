# Description:
#  Tools for building the WitWidget Jupyter pip package.

package(default_visibility = ["//visibility:private"])

licenses(["notice"])  # Apache 2.0

# rm -rf /tmp/wit-pip
# bazel run //tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package
sh_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.sh"],
    data = [
        "MANIFEST.in",
        "README.rst",
        "setup.py",
        "wit-widget.json",
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard:wit_jupyter", # For HTML payload
        "//tensorboard/plugins/interactive_inference/witwidget/notebook/jupyter/js:js_files",
        "//tensorboard/plugins/interactive_inference/utils:inference_utils",  # Utility method that visualization code uses.
        "//tensorboard/plugins/interactive_inference/witwidget",  # WitWidget code
        "//tensorboard/plugins/interactive_inference/witwidget:version",  # Version module (read by setup.py)
    ],
    tags = [
        "local",
        "manual",
    ],
)
