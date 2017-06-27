package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_webtesting//web:web.bzl", "browser")

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
    required_tags = [
        "local",
        "noci",
    ],
    deps = [
        "@org_chromium_chromedriver",
        "//third_party/chromium",
    ],
)

