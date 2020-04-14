# Benchmark for vz_line_chart2

To run the benchmark, do:

- run `bazel run tensorboard/components/vz_line_chart2/microbenchmark:binary`
- open browser and go to localhost:6006/benchmark.html
- make sure the browser is in foreground as requestAnimationFrame can behave differently when tab is in background.
- do not interact with browser that can inject noises (resize will cause layout and compositing)

To add a new benchmark, do:

- create a file with suffix "\_spec.ts" for consistency
- call a `benchmark` method on './spec.js'.

An example the benchmark run is (using consoleReporter):

Hardware:
- MacBookPro13,2, i7 @ 3.3GHz
- macOS 10.15.4
- Google Chrome 80.0.3987.149

| name                                                    | numIterations | avgTime                    |
| ------------------------------------------------------- | ------------- | -------------------------- |
| charts init                                             | 10            | 65.9879999991972ms / run   |
| charts init + 1k point draw                             | 10            | 66.03100000065751ms / run  |
| redraw: one line of 1k draws                            | 100           | 96.12760000105482ms / run  |
| redraw: one line of 100k draws                          | 10            | 854.3104999960633ms / run  |
| redraw: alternative two 1k lines                        | 25            | 63.42060000053607ms / run  |
| redraw: 500 lines of 1k points                          | 10            | 2203.0529999989085ms / run |
| make new chart: 10 lines of 1k points                   | 25            | 30.425399995874614ms / run |
| redraw 100 charts (1k points)                           | 10            | 1153.0329999979585ms / run |
| toggle run on 100 charts (1k points)                    | 25            | 6214.246399998665ms / run  |
| smoothing change: 1k points                             | 25            | 62.69300000043586ms / run  |
| smoothing change: 100k points                           | 25            | 3320.5062000011094ms / run |
| smoothing change: 100k points: large screen (1200x1000) | 10            | 4624.3224999983795ms / run |
