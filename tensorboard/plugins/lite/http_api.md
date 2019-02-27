# TensorFlow Lite Plugin HTTP API

The plugin name is `lite`, so all its routes are under
`/data/plugin/lite`.

## `/data/plugin/lite/tflite_supported_ops`

Retrieves a JSON string array of tflite supported ops.
Here is an example.

```json
[
  "UnidirectionalSequenceLstm",
  "ZerosLike",
  "TopK",
  "Tanh",
  "Switch",
  "Sum",
  "Square",
  "Sqrt",
  "SpaceToDepth",
  "UnidirectionalSequenceRnn",
  "SpaceToBatchND",
  "Slice",
  "Sin",
  ...
  "StopGradient",
  "All",
  "AddN",
  "Add",
  "DynamicPartition",
  "Abs"
]
```

## `/data/plugin/lite/checkpoints`

Retrieves a JSON string array of current model checkpoints.
Here is an example.

```json
[
  "model.ckpt-1",
  "model.ckpt-400",
  "model.ckpt-800",
  "model.ckpt-401"
]
```

Used by the Lite Controls to render checkpoint select.

## `/data/plugin/lite/run_toco`

Posts parameters to backend to build a tflite model, and return the result of
building details.

The request body contains three properties:
  * input_nodes: string array, input nodes name
  * output_nodes: string array, output nodes name
  * batch_size: integer, size of batch
  * checkpoint: string, the selected checkpoint name

The response is a json object of toco execution result, it contains two major
properties: `result` and `tabs`, `result` is a string that indicates whether
the execution is successful or not. `tabs` is a list of data to show in the
result dialog.

Here is an example.

request:

```json
{
    "input_nodes":[“input”, “...”],
    "output_nodes":[”MobilenetV1/Predictions/Reshape_1“, “...”],
    "batch_size":1,
    "checkpoint": "checkpoint_name"
}

```

response:

```json
{
  "result": "success",
  "tabs": [{
    "name": "summary",
    "content": [{
      "type": "text",
      "body": "Success..."
    }]
  }, {
    "name": "command",
    "content": [{
      "type": "code",
      "body": "freeze_graph..."
    }]
  }]
}
```
