# Distribution plugin HTTP API

The distribution plugin name is `distributions`, so all its routes are
under `/data/plugin/distributions`.

## `/data/plugin/distributions/tags`

Retrieves an index of tags containing distribution data. Note that
histograms and distributions share the same data source, so they will
always have identical sets of tags.

The result is a dictionary mapping from `runName` (quoted string) to
dictionaries that map a `tagName` (quoted string) to an object
containing that tag’s `displayName` and `description`, the latter of
which is a string containing sanitized HTML to be rendered into the DOM.
Here is an example:

    {
      "train_run": {
        "conv1/weights": {
          "displayName": "Weights (layer: conv1)",
          "description": "<p>Weights for the <tt>conv1</tt> layer. Initialized with random normals.</p>"
        },
        "conv1/biases": {
          "displayName": "Biases (layer: conv1)",
          "description": "<p>Biases for the <tt>conv1</tt> layer. Zero-initialized.</p>"
        }
      }
      "eval": {
        ...
      }
    }

Note that runs without any histogram tags are included as keys with
value the empty dictionary.

## `/data/plugin/distributions/distributions?run=foo&tag=bar`

Returns an array of distribution events for the given run and tag. Each
event is an array of the form `[wall_time, step, distribution]`. Each
distribution is an array of the form

    [[bp_1, icdf_1], ..., [bp_k, icdf_k]]

where each `icdf_i` is the value of the inverse CDF of the probability
distribution provided by the data evaluated at `bp_i / 10000`. That is,
each `icdf_i` is the lowest value such that `bp_i / 10000` of the values
in the original data fall below `icdf_i`.

The `bp_i` are the fixed values of `NORMAL_HISTOGRAM_BPS` in the
`compressor` module of this package; `k` is `len(NORMAL_HISTOGRAM_BPS)`
(and is a small constant, like `9`).

Here is an annotated example (note that real data has higher precision):

    [
      [
        1443871386.185149, # wall_time
        235166,            # step
        [
          [0, -11.487],    # indicates that the minimum value is -11.487
          [668, -4.910],
          [1587, -2.064],
          [3085, 0.299],
          [5000, 2.875],   # indicates that the median value is 2.875
          [6915, 5.307],
          [8413, 7.946],
          [9332, 10.467],
          [10000, 20.525]  # indicates that the maximum value is 20.525
        ]
      ]
    ]
