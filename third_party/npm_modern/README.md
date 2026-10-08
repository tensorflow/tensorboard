# Modern JavaScript dependencies

This directory is the incremental `rules_js` package workspace used while
TensorBoard still has legacy `rules_nodejs`/Yarn consumers.

Keep this workspace small: add a package only when a production target is being
migrated to `tf_ts_project` or another modern JavaScript rule. This prevents the
complete legacy dependency graph from being translated during unrelated Bazel
analysis.

To update the lockfile from the repository root:

```sh
bazel run @pnpm//:pnpm -- \
  --dir "$PWD/third_party/npm_modern" \
  install --lockfile-only
```

Lifecycle hooks remain disabled by default. Review any package that requires an
install script and explicitly add it to `allowBuilds` in
`pnpm-workspace.yaml`.

The isolated `//tensorboard/defs:rules_ts_canary` target verifies this package
workspace and the rules_ts compiler without changing the provider graph of
legacy production targets.
