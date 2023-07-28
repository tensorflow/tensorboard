load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_binary(
    name = "resource_digest_suffixer",
    srcs = ["resource_digest_suffixer.py"],
)

py_test(
    name = "resource_digest_suffixer_test",
    srcs = ["resource_digest_suffixer_test.py"],
    deps = [
        ":resource_digest_suffixer",
        "//tensorboard:test",
    ],
)
