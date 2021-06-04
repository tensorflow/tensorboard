load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

genrule(
    name = "gen_inactive_component.ng.html",
    srcs = ["inactive_component.uninlined.ng.html"] + glob(["images/*.png"]),
    outs = ["inactive_component.ng.html"],
    cmd = "$(execpath //tensorboard/defs:inline_images) $(SRCS) >'$@'",
    exec_tools = ["//tensorboard/defs:inline_images"],
)

tf_ng_module(
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
