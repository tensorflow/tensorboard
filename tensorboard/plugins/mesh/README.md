# Mesh Plugin

## Overview
Mesh and point cloud are important and powerful types of data to represent 3D
shapes and widely studied in the field of computer vision and computer 
graphics.
3D data is becoming more ubiquitous and researchers challenge new problems like
3D geometry reconstruction from 2D data, 3D point cloud semantic segmentation,
aligning or morphing 3D objects and so on. Therefore, visualizing results,
especially during the training stage, is critical to better understand how
the model performs.

![Mesh Plugin in TensorBoard](
https://storage.googleapis.com/tensorflow-graphics/git/readme/tensorboard_plugin.jpg)

This plugin intends to display 3D point cloud or mesh (triangulated point 
cloud)
in TensorBoard. In addition, it allows the user to
interact with the rendered object.

## Summary API
Either a mesh or a point cloud can be represented by a set of tensors. For
example, one can viewpoint cloud as a set of 3D coordinates of the points and
some colors associated with each point.

```python
from tensorboard.plugins import mesh
...
point_cloud = tf.constant([[[0.19, 0.78, 0.02], ...]], shape=[1, 1064, 3])
point_colors = tf.constant([[[128, 104, 227], ...]], shape=[1, 1064, 3])

summary = mesh.summary('point_cloud', vertices=point_cloud, colors=point_colors)
```

NOTE `colors` tensor is optional in this case but can be useful to show
different semantics of the points.

The plugin currently supports only triangular meshes which are different from
point clouds above only by the presence of faces - set of vertices representing
the triangle on the mesh.

```python
mesh = tf.constant([[[0.19, 0.78, 0.02], ...]], shape=[1, 1064, 3])
colors = tf.constant([[[128, 104, 227], ...]], shape=[1, 1064, 3])
faces = tf.constant([[[13, 78, 54], ...]], shape=[1, 752, 3])

summary = mesh.summary('mesh', vertices=mesh, colors=colors, faces=faces)
```

Again, only the `colors` tensor is optional for mesh summaries.

## Scene configuration
Another aspect of displaying 3D visualizations is a scene configuration, i.e.
intensity and color of light sources, objects' material, camera models and so
on. All of that can be configured via an additional parameter `config_dict`.
This dictionary may contain three high-level keys: `camera`, `lights` and
`material`. Each key must also be a dictionary with mandatory key `cls`,
representing valid [THREE.js](https://threejs.org) class name.

```python
camera_config = {'cls': 'PerspectiveCamera'}
summary = mesh.summary('mesh', vertices=mesh, colors=colors, faces=faces,
  config_dict={'camera': camera_config})
```

`camera_config` from the snippet above can be expanded according to the
[THREE.js documentation](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene).
All keys from `camera_config` will be passed to a class with name
`camera_config.cls`. For example (based on the
[`PerspectiveCamera` documentation](https://threejs.org/docs/index.html#api/en/cameras/PerspectiveCamera)):

```python
camera_config = {
  'cls': 'PerspectiveCamera',
  'fov': 0.75,
  'aspect': 0.9,
}
...
```

Keep in mind that scene configuration is not a trainable variable (i.e. static)
and should be provided only during the creation of summaries.

## How to install
Currently the plugin is part of TensorBoard nightly build, therefore you have 
to install it before using the plugin.
### Colab

```shell
!pip install -q -U tb-nightly
```

Then load Tensorboard extension and run it, similar to how you would do it in the Terminal:

```shell
%load_ext tensorboard
%tensorboard --logdir=/path/to/logs
```

Please open [example colab](https://colab.sandbox.google.com/drive/1E6j9qXMGhxYb17diCR5qFMMk2YgC_Kk6) for more details.

### Terminal
If you want to run TensorBoard nightly build locally, first you need to install it:

```shell
pip install tf-nightly
```

Then build it with [bazel](https://bazel.build/):

```shell
bazel build tensorboard
```

And finally run it:

```shell
./bazel-bin/tensorboard/tensorboard --logdir path/to/logs
```