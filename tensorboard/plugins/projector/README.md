## Development

To develop the Embedding Projector, launch it in standalone mode:
```sh
bazel run tensorboard/plugins/projector/vz_projector:devserver
```

And open `http://localhost:6006/index.html`. The projector uses the local
`standalone_projector_config.json` to find its datasets and fetch the
embedding files from Google Cloud Storage.
