package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_webtesting//web:web.bzl", "browser")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_archive")

licenses(["notice"])

config_setting(
    name = "mac",
    values = {"cpu": "darwin"},
    visibility = ["//:__subpackages__"],
)

config_setting(
    name = "linux",
    values = {"cpu": "k8"},
    visibility = ["//:__subpackages__"],
)

browser(
    name = "chromium",
    environment = select({
        ":linux": None,
        ":mac": {"DISABLE_X_DISPLAY": "1"},
    }),
    metadata = "chromium.json",
    deps = [
        "//third_party/chromium:chromedriver",
        "//third_party/chromium",
    ],
)

