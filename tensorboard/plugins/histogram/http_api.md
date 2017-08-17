# Histogram plugin HTTP API

The histogram plugin name is `histograms`, so all its routes are under
`/data/plugin/histograms`.

## `/data/plugin/histograms/tags`

Retrieves an index of tags containing histogram data.

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

## `/data/plugin/histograms/histograms?run=foo&tag=bar`

Returns an array of histogram events for the given run and tag. Each
event is an array of the form `[wall_time, step, histogram]`. Each
histogram is itself an array of buckets of the form `[min, max, count]`.
The `wall_time` is a floating-point number of seconds since epoch, and
`step` is an integer step counter.

Here is an annotated example (note that real data has higher precision):

    [
      [
        1443871386.185149, # wall_time
        235166,            # step
        [
          [0.0, 1.0, 123.0],
          [1.0, 2.0, 234.0],
          [2.0, 3.0, 188.0]
        ]
      ]
    ]
