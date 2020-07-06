# nPMI plugin HTTP API

The npmi plugin name is `npmi`, so all its routes are under `data/plugin/npmi`.

## `data/plugin/npmi/tags`

Retrieves an index of tags that were written to the summary.

Returns a dictionary mapping from `runName` to an array of dictionaries mapping
from `tagName` to the table they were exported for. Example:

```json
{
  "run_1": {
    "metric_annotations": {
      "table": "label_statistics"
    },
    "metric_classes": {
      "table": "label_statistics"
    },
    "metric_results": {
      "table": "label_statistics"
    }
  }
}
```

## `data/plugin/npmi/annotations`

Retrieves all the annotations that were written to the summary.

Returns a dictionary mapping from `runName` to an array of annotations. Example:

```json
{
  "run_1": {
    "annotations": [
      "tree",
      "field",
      "road",
    ]
  }
}
```

## `data/plugin/npmi/metrics`

Retrieves all the metrics that were calculated.

Returns a dictionary mapping from `runName` to an array of metrics. Example:

```json
{
  "run_1": {
    "metrics": [
      "npmi@green",
      "npmi@blue",
      "npmi@red",
    ]
  }
}
```

## `data/plugin/npmi/values`

Retrieves all the values that were calculated.

Returns a dictionary mapping from `runName` to an array of arrays of metric
values. Example:

```json
{
  "run_1": {
    "values": [
      [
        0.34362471103668213,
        0.17068558931350708,
        0.28587889671325684,
      ],
      [
        0.17293912172317505,
        0.05774582177400589,
        -0.17293912172317505,
      ],
      [
        -0.11519329994916916,
        -0.05774582177400589,
        0.11519329994916916
      ]
    ]
  }
}
```
