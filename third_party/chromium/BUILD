package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

config_setting(
    name = "mac",
    values = {"cpu": "darwin"},
)

config_setting(
    name = "linux",
    values = {"cpu": "k8"},
)

alias(
    name = "chromium",
    testonly = True,
    actual = select({
        ":linux": "@org_chromium_chromium_linux_x64//:metadata",
        ":mac": "@org_chromium_chromium_macos//:metadata",
    }),
    visibility = ["//tensorboard/functionaltests/browsers:__pkg__"],
)

alias(
    name = "chromedriver",
    testonly = True,
    actual = select({
        ":linux": "@org_chromium_chromedriver_linux_x64//:metadata",
        ":mac": "@org_chromium_chromedriver_macos//:metadata",
    }),
    visibility = ["//tensorboard/functionaltests/browsers:__pkg__"],
)
