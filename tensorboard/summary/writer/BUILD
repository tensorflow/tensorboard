# Description:
# Writer interfaces for TensorBoard if tensorflow is not present
package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "writer",
    srcs = [
        "__init__.py",
        "event_file_writer.py",
        "record_writer.py",
    ],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/compat:tensorflow",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "event_file_writer_test",
    size = "small",
    srcs = ["event_file_writer_test.py"],
    main = "event_file_writer_test.py",
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":writer",
        "//tensorboard:test",
    ],
)

py_test(
    name = "event_file_writer_s3_test",
    size = "small",
    srcs = ["event_file_writer_s3_test.py"],
    main = "event_file_writer_s3_test.py",
    srcs_version = "PY3",
    tags = [
        "manual",
        "notap",
        "support_notf",
    ],
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
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":writer",
        "//tensorboard:test",
    ],
)
