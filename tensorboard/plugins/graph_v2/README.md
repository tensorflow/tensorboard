# TensorBoard Graph Plugin, V2

This is a substantial refactoring of the Graph plugin, currently in development.

It is set up as a Dynamic Plugin and is not installed in TensorBoard by default.

## Development Quick Start

In one terminal,

- Configure and activate a virtualenv, as appropriate.
- Run `./dev.sh`. This does two things:
  - Does a clean build of the Python backend, and installs the package in
    development mode.
  - Starts an Angular build server that watches for frontend source changes.

In another terminal,

- Paste the `export TENSORBOARD_GRAPH_V2_PATH` line given in the output above.
  This enables live updates to the plugin frontend.
- `bazel run //tensorboard -- --logdir /tmp/scalars_demo` (using whatever log
  data directory you have handy).

Python changes require re-running `./dev.sh` and restarting TensorBoard.

Frontend changes should be reflected immediately upon reloading the page.
There is no hot-reload (yet?) but there is also no need to restart the
TensorBoard server.

## Run Frontend Tests

    cd ./tensorboard_plugin_graph_v2/frontend
    npm install
    npm test
