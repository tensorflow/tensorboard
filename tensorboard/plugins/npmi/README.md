# nPMI Plugin

The nPMI plugin is a frontend to the techniques presented in a [paper](https://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdf) by Gelof Bouma.

The plugin is currently experimental and under active development.

## Demo Data

To experiment with the plugin without the need to generate real log data, simply generate demo data using `bazel run //tensorboard/plugins/npmi:npmi_demo` and then start the plugin with `bazel run tensorboard -- --logdir /tmp/npmi_demo`.
