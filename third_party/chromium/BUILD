load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_archive")

licenses(["notice"])

config_setting(
    name = "mac",
    values = {"cpu": "darwin"},
)

config_setting(
    name = "linux",
    values = {"cpu": "k8"},
)

web_test_archive(
    name = "chromium",
    archive = "@org_chromium_chromium//:archive",
    named_files = select({
        ":linux": {
            "CHROME": "chrome-linux/chrome",
        },
        ":mac": {
            "CHROME": "chrome-mac/Chromium.app/Contents/MacOS/chromium",
        },
    }),
    visibility = ["//tensorboard/functionaltests/browsers:__pkg__"],
)
