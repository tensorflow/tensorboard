# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "writer",
    srcs = glob([
        "*.py",
    ]),
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@org_pythonhosted_six",
    ],
)


py_test(
    name = "event_file_writer_test",
    size = "small",
    srcs = ["event_file_writer_test.py"],
    main = "event_file_writer_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":event_file_writer",
        # "//tensorboard:expect_tensorflow_installed",
        # "//tensorboard/backend:application",
        # "//tensorboard/backend/event_processing:event_accumulator",
        # "//tensorboard/backend/event_processing:event_multiplexer",
        # "//tensorboard/plugins:base_plugin",
        # "//tensorboard/util:test_util",
        # "@org_pocoo_werkzeug",
        # "@org_pythonhosted_six",
    ],  # TODO: I am not sure what to put here
)