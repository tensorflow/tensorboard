# TensorFlow Lite Plugin HTTP API

The plugin name is `lite`, so all its routes are under
`/data/plugin/lite`.

## `/data/plugin/lite/list_supported_ops`

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

## `/data/plugin/lite/list_saved_models`

Retrieves a JSON string array of current saved model directories.
Here is an example.

```json
[
  "exported_saved_model_1",
  "exported_saved_model_2",
  ...
]
```

Each directory contains a valid TF saved model.

Used by the Lite Controls to render a list of saved model.

## `/data/plugin/lite/script`

Posts parameters to backend, and returns model conversion script.

The request body contains three properties:
  * input_arrays: string array, a list of input node names
  * output_arrays: string array, a list output nodes names
  * saved_model: string, the selected saved model directory
Here is an example.

request:

```json
{
    "input_arrays":["input", "..."],
    "output_arrays":["MobilenetV1/Predictions/Reshape_1", "..."],
    "saved_model": "saved_model_dir"
}

```

response:
```
# Python script.

import tensorflow as tf
...
```
which contains the generated script for model conversion.


## `/data/plugin/lite/convert`

Posts parameters to backend to build a TF Lite model, and returns the result.

The request body is same as `/data/plugin/lite/script`.

The response is a json object of TF Lite Converter result, it contains two major
properties: `result` and `tabs`, `result` is a string that indicates whether
the execution is successful or not. `tabs` is a list of data to show in the
result dialog.

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
