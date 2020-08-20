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

Runs without any scalar tags are omitted from the result.

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

## `/data/plugin/scalars/scalars_multirun` (POST)

Accepts form-encoded POST data with a (required) singleton key `tag` and a
repeated key `runs`. Returns a JSON object mapping run names to arrays of the
form returned by `/data/plugin/scalars/scalars`. A run will only be present in
the output if there actually exists data for that run-tag combination. If there
is no data for some or all of the run-tag combinations, no error is raised, but
the response may lack runs requested in the input or be an empty object
entirely.

Example request:

```javascript
const formData = new FormData();
formData.set("tag", "xent/xent_1");
formData.append("runs", "mnist/lr_1E-03,conv=1,fc=2");
formData.append("runs", "mnist/lr_1E-03,conv=2,fc=2");
const response = await fetch(
  "/data/plugin/scalars/scalars_multirun",
  {method: "POST", body: formData}
);
```

Example response:

```json
{
  "mnist/lr_1E-03,conv=1,fc=2": [
    [1563406328.158425, 0, 3.8424863815307617],
    [1563406328.5136807, 5, 5.210817337036133]
  ],
  "mnist/lr_1E-03,conv=2,fc=2": [
    [1563406405.8505669, 0, 11.278410911560059],
    [1563406406.357564, 5, 7.649646759033203]
  ]
}
```
