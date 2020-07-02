load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

genrule(
    name = "gen_inactive_component.ng.html",
    srcs = ["inactive_component.uninlined.ng.html"],
    outs = ["inactive_component.ng.html"],
    cmd = "$(execpath //tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive:inline_images) $< >$@",
    tools = [":inline_images"],
)

sh_binary(
    name = "inline_images",
    srcs = ["inline_images.sh"],
    data = glob(["images/*.png"]),
)

ng_module(
    name = "inactive",
    srcs = [
        "inactive_component.ts",
        "inactive_container.ts",
        "inactive_module.ts",
    ],
    assets = [
        "inactive_component.css",
        "inactive_component.ng.html",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
