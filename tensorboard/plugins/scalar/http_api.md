# Scalar plugin HTTP API

The scalar plugin name is `scalars`, so all its routes are under
`/data/plugin/scalars`.

## `/data/plugin/scalars/tags`

Retrieves an index of tags containing scalar data.

Returns a dictionary mapping from `runName` (quoted string) to
dictionaries that map a `tagName` (quoted string) to an object
containing that tag’s `displayName` and `description`, the latter of
which is a string containing sanitized HTML to be rendered into the DOM.
Here is an example:

    {
      "train_run": {
        "loss": {
          "displayName": "Loss",
          "description": "<p>Model loss, computed with a cross-entropy metric.</p>"
        },
        "learning_rate": {
          "displayName": "Learning rate",
          "description": ""
        }
      },
      "eval": {
        "precision": {
          "displayName": "Precision",
          "description": "<p>Proportion of true positives over all positives.</p>"
        },
        "recall": {
          "displayName": "Recall",
          "description": "<p>Proportion of true positives over all true samples.</p>"
        }
      }
    }

Note that runs without any scalar tags are included as keys with value the
empty dictionary.

## `/data/plugin/scalars/scalars?run=foo&tag=bar`

Returns an array of scalar events for the given run and tag. Each event
is an array of the form `[wall_time, step, value]`, where `wall_time` is
a floating-point number of seconds since epoch, `step` is an integer
step counter, and `value` is the actual scalar value.

Example:

    [
      [1443856985.705543, 1448, 0.7461960315704346],  # wall_time, step, value
      [1443857105.704628, 3438, 0.5427092909812927],
      [1443857225.705133, 5417, 0.5457325577735901],
      ...
    ]

If the query parameter `&format=csv` is provided, the response will
instead be in CSV format:

    Wall time,Step,Value
    1443856985.705543,1448,0.7461960315704346
    1443857105.704628,3438,0.5427092909812927
    1443857225.705133,5417,0.5457325577735901
