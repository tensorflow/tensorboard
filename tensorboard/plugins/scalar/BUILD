# Description:
# TensorBoard plugin for scalars

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
  name = "api",
  srcs = ["__init__.py"],
  srcs_version = "PY2AND3",
  deps = ["//tensorboard:expect_tensorflow_installed"]
)

## Scalars Plugin (For TensorBoard backend) ##
py_library(
    name = "scalars_plugin",
    srcs = ["scalars_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "scalars_plugin_test",
    size = "small",
    srcs = ["scalars_plugin_test.py"],
    main = "scalars_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":scalars_plugin",
        "//tensorboard:api",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "api_test",
    size = "small",
    srcs = ["api_test.py"],
    main = "api_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":scalars_plugin",
        "//tensorboard:api",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_binary(
    name = "scalars_demo",
    srcs = ["scalars_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:api",
        "//tensorboard:expect_tensorflow_installed",
        "@six_archive//:six",
    ],
)
