package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_webtesting//web:web.bzl", "browser")

licenses(["notice"])

browser(
    name = "headless_chrome",
    environment = {"DISABLE_X_DISPLAY": "1"},
    metadata = "headless_chrome.json",
    # TODO(@dandelionmane): Put in SELECT to check if platform supported
    deps = [
            "@org_chromium_chromium",
            "@org_chromium_chromedriver",
        ],
)
