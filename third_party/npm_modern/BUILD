load("@npm_modern//:defs.bzl", "npm_link_all_packages")

package(default_visibility = ["//tensorboard:internal"])

# Parallel rules_js package links. Add dependencies to this workspace only as
# production targets are migrated away from the legacy @npm repository.
npm_link_all_packages(name = "node_modules")
