# Description:
# Writer interfaces for TensorBoard if tensorflow is not present
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

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
    # This target depends directly on //tensorboard/compat and on the TF stub to
    # ensure it doesn't pick up a TF build dependency, which may happen when using
    # //tensorboard/compat:tensorflow when the code is synced internally.
    #
    # TODO(#4581): implement a better abstraction for filesystem layer that includes
    #   the option to use tf.io.gfile if available, eliminating need to rely on the
    #   overall switching logic from tensorboard.compat.tf (see also #3666).
    deps = [
        "//tensorboard/compat",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
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
    name = "event_file_writer_fsspec_test",
    size = "small",
    srcs = ["event_file_writer_fsspec_test.py"],
    main = "event_file_writer_fsspec_test.py",
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":writer",
        "//tensorboard:expect_fsspec_installed",
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
