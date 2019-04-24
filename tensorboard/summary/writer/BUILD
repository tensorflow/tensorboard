# Description:
# Writer interfaces for TensorBoard if tensorflow is not present
package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "writer",
    srcs = [
        "__init__.py",
        "event_file_writer.py",
        "record_writer.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
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
        ":writer",
        "//tensorboard:test",
    ],
)

py_test(
    name = "record_writer_test",
    size = "small",
    srcs = ["record_writer_test.py"],
    main = "record_writer_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":writer",
        "//tensorboard:test",
    ],
)