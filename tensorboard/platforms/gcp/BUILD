# Description:
# Support for Cloud Spanner with TensorBoard

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])  # Needed for internal repo.

py_library(
    name = "expect_cloud_spanner_installed",
    # This is a dummy rule used as a sqlite3 dependency in open-source.
    # We expect Cloud Spanner client libraries to already be present.
    # See https://googlecloudplatform.github.io/google-cloud-python/latest/spanner/usage.html
    visibility = ["//visibility:public"],
)

py_library(
    name = "spanner",
    srcs = ["spanner.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":expect_cloud_spanner_installed",
        "//tensorboard:db",
    ],
)

py_test(
    name = "spanner_test",
    size = "medium",
    srcs = ["spanner_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":expect_cloud_spanner_installed",
        ":spanner",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "spanner_e2e_test",
    size = "medium",
    srcs = ["spanner_e2e_test.py"],
    srcs_version = "PY2AND3",
    # Manual test because it requires cloud access.
    tags = ["manual"],
    deps = [
        ":expect_cloud_spanner_installed",
        ":spanner",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)