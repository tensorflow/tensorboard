## Development

To develop the Embedding Projector, launch it in standalone mode:
```sh
bazel run tensorboard/plugins/projector/vz_projector:devserver
```

And open <http://localhost:6006/index.html>. The projector points to the local
`standalone_projector_config.json` file, which configures it with a set of
public datasets (word2vec, mnist, iris) that are useful for development
and are hosted on Google Cloud Storage.
