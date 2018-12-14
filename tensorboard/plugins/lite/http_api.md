# Precision—Recall Curve Plugin HTTP API

The plugin name is `pr_curves`, so all its routes are under
`/data/plugin/pr_curves`.

## `/data/plugin/pr_curves/available_time_entries`

Retrieves a JSON object mapping run name to a list of time entries (one for each
step). Each time entry has 2 properties:

* **step**: The step of the event.
* **wall_time**: The time in seconds since the epoch at which the summary was
  written.

Here is an example.

```json
{
  "foo": [
    {
      "step": 0,
      "wall_time": 1503076940.949388,
    },
    {
      "step": 1,
      "wall_time": 1503076940.953447,
    },
    {
      "step": 2,
      "wall_time": 1503076940.95812,
    }
  ],
  "bar": [
    {
      "step": 0,
      "wall_time": 1503076940.964225,
    },
    {
      "step": 1,
      "wall_time": 1503076940.969845,
    },
    {
      "step": 2,
      "wall_time": 1503076940.974917,
    }
  ],
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

Retrieves a JSON object whose keys are the names of all the runs (regardless of
whether they have available PR curve data). The values of that object are also
objects whose keys are tag strings (associated with the run) and whose values
are objects with 2 keys: `displayName` and `description` (associated with the
run-tag combination).

The `displayName` is shown atop individual plots in TensorBoard. The description
might offer insight for instance into how data was generated.

Importantly, the `description` contains sanitized HTML to be injected into the
DOM, while the `displayName` is simply an arbitrary string.

Here is an example.

```json
{
  "foo": {
    "green/pr_curves": {
      "displayName": "classifying green",
      "description": "Human eyes are very sensitive to green."
    },
    "red/pr_curves":  {
      "displayName": "classifying red",
      "description": "Human eyes are also pretty sensitive to red."
    },
  },
  "bar": {
    "green/pr_curves": {
      "displayName": "classifying green",
      "description": "Human eyes are very sensitive to green."
    },
    "blue/pr_curves":  {
      "displayName": "classifying blue",
      "description": "Human eyes are not as sensitive to blue."
    },
  },
}
```

Used by TensorBoard for categorizing PR Curve plots into runs and tags as well
as to show metadata associated with each plot.
