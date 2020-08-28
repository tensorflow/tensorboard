load("@io_bazel_rules_webtesting//web:web.bzl", "browser")

package(default_visibility = ["//tensorboard:internal"])

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
    visibility = ["//visibility:public"],
    deps = [
        "//third_party/chromium",
        "//third_party/chromium:chromedriver",
        "@io_bazel_rules_webtesting//go/wsl",
    ],
)
