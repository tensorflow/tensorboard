# Benchmark for vz_line_chart2

To run the benchmark, do:

- run `bazel run tensorboard/components/vz_line_chart2/microbenchmark:binary`
- open browser and go to localhost:6006/benchmark.html
- make sure the browser is in foreground as requestAnimationFrame can behave differently when tab is in background.
- do not interact with browser that can inject noises (resize will cause layout and compositing)

To add a new benchmark, do:

- create a file with suffix "\_spec.ts" for consistency
- call a `benchmark` method on './spec.js'.
