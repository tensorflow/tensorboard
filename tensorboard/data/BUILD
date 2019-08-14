# Description:
# Experimental framework for generic TensorBoard data providers.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "provider",
    srcs = ["provider.py"],
    srcs_version = "PY2AND3",
    deps = [
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "provider_test",
    size = "small",
    srcs = ["provider_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":provider",
        "//tensorboard:test",
        "@org_pythonhosted_six",
    ],
)
