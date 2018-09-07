package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("@com_google_protobuf//:protobuf.bzl", "py_proto_library")

py_library(
    name = "common_utils",
    srcs = ["common_utils.py"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "oss_utils",
    srcs = ["oss_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        "//tensorboard/plugins/interactive_inference/utils/serving:classification_py_library",
        "//tensorboard/plugins/interactive_inference/utils/serving:prediction_service_py_library",
        "//tensorboard/plugins/interactive_inference/utils/serving:regression_py_library",
    ],
)
py_library(
    name = "inference_utils",
    srcs = ["inference_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":oss_utils",
        ":inference_py_library",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/interactive_inference/utils/serving:classification_py_library",
        "//tensorboard/plugins/interactive_inference/utils/serving:regression_py_library",
    ],
)

py_library(
    name = "test_utils",
    testonly = 1,
    srcs = ["test_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ]
)

py_proto_library(
    name = "inference_py_pb2",
    srcs = ["inference.proto"],
    srcs_version = "PY2AND3",
    deps = [
      "//tensorboard/plugins/interactive_inference/utils/serving:classification_py_pb2",
      "//tensorboard/plugins/interactive_inference/utils/serving:regression_py_pb2",
      "@com_google_protobuf//:protobuf_python",
      ],
    protoc = "@com_google_protobuf//:protoc",
    default_runtime = "@com_google_protobuf//:protobuf_python",
)

py_library(
    name = "inference_py_library",
    srcs = ["inference_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
      "//tensorboard/plugins/interactive_inference/utils/serving:classification_py_library",
      "//tensorboard/plugins/interactive_inference/utils/serving:regression_py_library",
    ]
)

py_proto_library(
    name = "test_hack",
    srcs = ["test_hack.proto"]
)

py_test(
    name = "inference_utils_test",
    size = "small",
    srcs = ["inference_utils_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":inference_utils",
        ":test_hack",
        ":test_utils",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/interactive_inference/utils/serving:classification_py_library",
        "//tensorboard/plugins/interactive_inference/utils/serving:regression_py_library",
    ],
)
