package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("@com_google_protobuf//:protobuf.bzl", "py_proto_library")

py_proto_library(
    name = "input_py_pb2",
    srcs = ["input.proto"],
    srcs_version = "PY2AND3",
    deps = [
      "@org_tensorflow//tensorflow/core:protos_all_py",
      "@protobuf_archive//:protobuf_python",
      ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "input_py_library",
    srcs = ["input_pb2.py"],
    srcs_version = "PY2AND3",
)

py_proto_library(
    name = "model_py_pb2",
    srcs = ["model.proto"],
    srcs_version = "PY2AND3",
    deps = [
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "model_py_library",
    srcs = ["model_pb2.py"],
    srcs_version = "PY2AND3",
)

py_proto_library(
    name = "regression_py_pb2",
    srcs = ["regression.proto"],
    srcs_version = "PY2AND3",
    deps = [
        ":input_py_pb2",
        ":model_py_pb2",
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "regression_py_library",
    srcs = ["regression_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":input_py_library",
        ":model_py_library",
    ]
)

py_proto_library(
    name = "classification_py_pb2",
    srcs = ["classification.proto"],
    srcs_version = "PY2AND3",
    deps = [
        ":input_py_pb2",
        ":model_py_pb2",
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "classification_py_library",
    srcs = ["classification_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":input_py_library",
        ":model_py_library",
    ]
)

py_proto_library(
    name = "get_model_metadata_py_pb2",
    srcs = ["get_model_metadata.proto"],
    srcs_version = "PY2AND3",
    deps = [
        ":model_py_pb2",
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "get_model_metadata_py_library",
    srcs = ["get_model_metadata_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":model_py_library",
    ]
)

py_proto_library(
    name = "predict_py_pb2",
    srcs = ["predict.proto"],
    srcs_version = "PY2AND3",
    deps = [
        ":model_py_pb2",
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "predict_py_library",
    srcs = ["predict_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":model_py_library",
    ]
)

py_proto_library(
    name = "inference_py_pb2",
    srcs = ["inference.proto"],
    srcs_version = "PY2AND3",
    deps = [
        ":classification_py_pb2",
        ":input_py_pb2",
        ":model_py_pb2",
        ":regression_py_pb2",
        "@org_tensorflow//tensorflow/core:protos_all_py",
        "@protobuf_archive//:protobuf_python",
    ],
    protoc = "@protobuf_archive//:protoc",
    default_runtime = "@protobuf_archive//:protobuf_python",
)


py_library(
    name = "inference_py_library",
    srcs = ["inference_pb2.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":classification_py_library",
        ":input_py_library",
        ":model_py_library",
        ":regression_py_library",
    ]
)

py_library(
    name = "prediction_service_py_library",
    srcs = [
        "prediction_service_pb2.py",
        "prediction_service_pb2_grpc.py"
    ],
    srcs_version = "PY2AND3",
    deps = [
        ":classification_py_library",
        ":get_model_metadata_py_library",
        ":inference_py_library",
        ":predict_py_library",
        ":regression_py_library",
    ]
)