package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])  # Needed for internal repo.

py_library(
    name = "encoder",
    srcs = ["encoder.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":op_evaluator",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:tf_contrib_ffmpeg",
    ],
)

py_test(
    name = "encoder_test",
    size = "small",
    srcs = ["encoder_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":encoder",
        ":test_util",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "op_evaluator",
    srcs = ["op_evaluator.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "op_evaluator_test",
    size = "small",
    srcs = ["op_evaluator_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":op_evaluator",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "platform_util",
    srcs = ["platform_util.py"],
    srcs_version = "PY2AND3",
)

py_test(
    name = "platform_util_test",
    size = "small",
    srcs = ["platform_util_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":platform_util",
        "//tensorboard:test",
    ],
)

py_library(
    name = "tb_logging",
    srcs = ["tb_logging.py"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "tensor_util",
    srcs = ["tensor_util.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
    ],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["test_util.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":tb_logging",
        "//tensorboard:expect_absl_logging_installed",
        "//tensorboard:expect_sqlite3_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)
