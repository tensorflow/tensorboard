# Precision—Recall Curve plugin HTTP API

The plugin name is `pr_curves`, so all its routes are under
`/data/plugin/pr_curves`.

## `/data/plugin/pr_curves/available_steps`

Retrieves a JSON object mapping run name to a list of numeric steps to use for
the step slider of the run. Here is an example.

```json
{
  "foo": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  "bar": [0, 2, 4, 6, 8]
}
```

## `/data/plugin/pr_curves/pr_curves`

Retrieves a JSON object mapping run name to a list of PR curve data entries (one
entry per step). This route requires a `tag` GET parameter as well as at least
one `run` GET parameter to specify both the tag and list of runs to retrieve
data for. 

Each PR data entry contains the following properties.

* **wall_time**: The wall time (number) in seconds since the epoch at which data
                 for the PR curve was collected.
* **step**: The step (number).
* **precision**: A list of precision values (numbers). The length of this list
                 is the number of thresholds used to generate PR curves.
* **recall**: A list of recall values that each pair-wise correspond to the list
              of precision values (numbers).

Here is an example. We assume 5 thresholds for PR curves. We also assume GET
parameters of `?tag=green/pr_curves&run=bar&run=foo`.

```json
{
  "bar": [
    {
      "wall_time": 1503076940.949388,
      "step": 0,
      "precision": [0.4242, 0.5, 0.6, 0.8, 1.0],
      "recall": [1.0, 0.6, 0.42, 0.1337, 0.0]
    },
    {
      "wall_time": 1503076940.953447,
      "step": 1,
      "precision": [0.43, 0.542, 0.642, 0.842, 1.0],
      "recall": [1.0, 0.642, 0.4242, 0.142, 0.0]
    },
    {
      "wall_time": 1503076940.95812,
      "step": 2,
      "precision": [0.2, 0.4, 0.6, 0.8, 1.0],
      "recall": [1.0, 0.8, 0.6, 0.42, 0.0]
    }
  ],
  "foo": [
    {
      "wall_time": 1503076940.964225,
      "step": 0,
      "precision": [0.32, 0.52, 0.62, 0.82, 1.0],
      "recall": [1.0, 0.82, 0.52, 0.32, 0.0]
    },
    {
      "wall_time": 1503076940.969845,
      "step": 1,
      "precision": [0.23, 0.35, 0.42, 0.5, 1.0],
      "recall": [1.0, 0.86, 0.64, 0.43, 0.0]
    },
    {
      "wall_time": 1503076940.974917,
      "step": 2,
      "precision": [0.1, 0.2, 0.3, 0.4, 1.0],
      "recall": [1.0, 0.9, 0.8, 0.7, 0.0]
    }
  ],
}
```

Used by the PR Curves dashboard to render plots.

## `/data/plugin/pr_curves/tags`

Retrieves a JSON mapping between run name and a list of tags (strings) available
for the run. Here is an example.

```json
{
  "foo": ["green/pr_curves", "red/pr_curves"],
  "bar": ["green/pr_curves", "red/pr_curves", "blue/pr_curves"]
}
```

Used by TensorBoard for categorizing PR Curve plots into runs and tags.
