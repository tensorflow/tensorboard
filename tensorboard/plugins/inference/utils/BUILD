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
        #"@tf_serving//tensorflow_serving/apis:classification_proto_py_pb2",
        #"@tf_serving//tensorflow_serving/apis:prediction_service_proto_py_pb2",
        #"@tf_serving//tensorflow_serving/apis:regression_proto_py_pb2",
    ],
)
py_library(
    name = "inference_utils",
    srcs = ["inference_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":oss_utils",
        ":inference_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        #"@tf_serving//tensorflow_serving/apis:classification_proto_py_pb2",
        #"@tf_serving//tensorflow_serving/apis:regression_proto_py_pb2",
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
      "@protobuf_archive//:protobuf_python",
      #"@tf_serving//tensorflow_serving/apis:classification_proto_py_pb2",
      #"@tf_serving//tensorflow_serving/apis:regression_proto_py_pb2",
      ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)

py_test(
    name = "inference_utils_test",
    size = "small",
    srcs = ["inference_utils_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":inference_utils",
        ":test_utils",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)
