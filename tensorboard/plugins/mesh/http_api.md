# Mesh plugin HTTP API

The mesh plugin name is `mesh`, so all its routes are under
`/data/plugin/mesh`.


## `/data/plugin/mesh/tags`

Retrieves an index of tags containing mesh data.

Returns a dictionary mapping from `runName` (quoted string) to
dictionaries that map a `tagName` (quoted string) to an object
containing that tag’s `displayName` and `description`, the latter of
which is a string containing sanitized HTML to be rendered into the DOM.
Here is an example:
```json
    {
        "train_run": {
            "mesh_color_tensor": {
                "samples": 1
            },
            "point_cloud": {
                "samples": 1
            }
        }
    }
```
Note that runs without any mesh tags are included as keys with value the empty
dictionary.


## `/data/plugin/mesh/meshes?tag=mesh_color_tensor&run=train_run&sample=0`

Retrieves all necessary metadata to render a mesh with particular tag.

Returns list of metadata for each data (tensor) that should be retrieved next.
This includes content type (i.e. vertices, faces or colors), shape of the
data, scene configuration, wall time etc. Type of the content maps directly to
underlying binary data type, i.e. `float32`, `int32` or `uint8`. Content type
mapping to their enum constant representations is given by a
[proto definition](https://github.com/tensorflow/tensorboard/plugins/mesh/plugin_data.proto).
Field `components` serves as bitmask representing all existing parts (vertices, colors, etc.) of the same mesh.

Here is an example:
```json
    [
        {
            "config": "{\"camera\": {\"cls\": \"PerspectiveCamera\", \"fov\":
            75}}",
            "data_shape": [1, 17192, 3],
            "step": 0,
            "content_type": 2,
            "wall_time": 1556678491.836787,
            "components": 14
        },
        {
            "config": "{\"camera\": {\"cls\": \"PerspectiveCamera\", \"fov\":
            75}}",
            "data_shape": [1, 9771, 3],
            "step": 0,
            "content_type": 3,
            "wall_time": 1556678491.836787,
            "components": 14
        },
        {
            "config": "{\"camera\": {\"cls\": \"PerspectiveCamera\", \"fov\":
            75}}",
            "data_shape": [1, 9771, 3],
            "step": 0,
            "content_type": 1,
            "wall_time": 1556678491.836787,
            "components": 14
        }
    ]
```
Scene configuration is a JSON string passed to `config_dict` during summary
creation and may contain the following high-level keys: `camera`, `lights` and
`material`. Each such key must correspond to an object with `cls` property
which must be a valid THREE.js class. The rest of the keys of the object will
be used as parameters to the class constructor and should also be valid
THREE.js options. Invalid keys will be ignored by the library.


## `/data/plugin/mesh/data?tag=mesh_color_tensor&run=train_run&content_type=VERTEX&sample=0&timestamp=1560968332.3`

Retrieves binary data of particular type representing some part of the mesh,
for example vertices with 3D coordinates. The data must be from particular point
in time (milliseconds in UTC).

Returns stream of binary data, which will represent either mesh vertices,
faces or RGB colors. Response type of this request is set to `arraybuffer`
therefore Typed Array will be received instead of a JSON string.
