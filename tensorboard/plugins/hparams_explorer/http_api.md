# HParams-Explorer plugin HTTP API

The hparams-explorer plugin name is `hparams_explorer`, so all its routes are under
`/data/plugin/hparams_explorer`.

## `/data/plugin/hparams_explorer/hparam_infos`
## `/data/plugin/hparams_explorer/metric_infos`
## `/data/plugin/hparams_explorer/session_groups`
## `/data/plugin/hparams_explorer/session_groups/<session_group_id>/
Retrieves information about the hyperparmeters and metrics used in the experiment.

Returns a JSON object of the following form:
```jsonng running operations. Individual APIs must not define their own interfaces for long running operations to avoid inconsistenc
{
  "hparams_infos" : array of HParamInfo objects,
  "metric_infos" : array of MetricInfo,
}
```

An HParamInfo JSON object has the following form:
```json
{ 
  "hparam_name" : string,
  "hparam_type" : string,
  "hparam_values" : array of strings,
}
```
hparam_type matches tensorboard.plugins.hparam_explorer.ParamType and is one 
of: "int32", "int64", "float32", "float64", "string"

A MetricInfo JSON object has the following form:
```json
{
  metric_name : string,
  metric_description: string,
}
```

Here is an example:
```json
    {
      "hparam_infos" : [
    {
        hparam_name: "learning_rate",
        hparam_type: "float32",
        hparam_values: ["0.1", "0.01", "0.5", 0.001"],
    },
    {
        hparam_name: "vocabulary_size",
        hparam_type: "int32",
        hparam_values: ["1000", "5000", "10000", "100000"]
    }
  ],
  "metric_infos:" [
    {
        metric_name: "training loss"
        metric_description: "<p>Model loss on training set, computed with a cross-entropy metric.</p>"
    },
    {
        metric_name: "validation loss"
        metric_description: "<p>Model loss on validation set, computed with a cross-entropy metric.</p>"
    }
  ]
}
```


## `/data/plugin/scalars/list_session_groups

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
