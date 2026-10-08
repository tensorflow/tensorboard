# Description:
# TensorBoard logo files.

load("@rules_shell//shell:sh_binary.bzl", "sh_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

sh_binary(
    name = "inline_favicon",
    srcs = ["inline_favicon.sh"],
    data = [
        "favicon.png",
    ],
)
