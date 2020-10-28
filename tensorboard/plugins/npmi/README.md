# nPMI Plugin

The nPMI plugin is a frontend to the techniques presented in a [paper](https://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdf) by Gelof Bouma.

The plugin is currently experimental and still under active development, however it can already be used as is.

## nPMI

nPMI is short for "normalized pointwise mutual information", which is a correlation metric. It can be used to analyze different aspects in the pipeline of neural network development, such as training data assessment as well as to get insights into the model.

## Using the Plugin

To make use of the plugin, the following steps are required.

### Data

- Mandatory: Exported nPMI data, annotations, and metrics. Metrics for npmi data need to be prefixed with `nPMI@` or `nPMI_diff@`. To export your nPMI calculations for use with this plugin, use our summary generators in `summary.py`.
- Optional: In addition to nPMI calculations, you can also export count values for annotation/metric pairs. This can be used as an indicator for how reliable the nPMI values are. Count values are provided as additional metrics prefixed with `count@`, and need to be provided to the summary exporters together with the nPMI values.

#### Demo Data

If you want to experiment with the plugin but do not have your own data, simply generate demo data using `bazel run //tensorboard/plugins/npmi:npmi_demo`.

#### Converting CSV Data

If you have csv data containing annotations as rows, and metrics in the first row of the csv, you can convert this data to logfiles which can be displayed by the plugin. As an example, you can run this demo target `bazel run //tensorboard/plugins/npmi:csv_to_plugin_data_demo -- --csv_path [path_to_your_csv_file]`.
For this to work correctly, you need metrics in the csv that are prefixed with `nPMI@` or `nPMI_diff@`. The values for these metrics should additionally be normalized between `-1.0` and `1.0`, and can contain `nan` values.

### Adding Embeddings to the Logs

To enable similarity-based analysis, you can also add embedding representations to the annotations of a dataset.
These have to be available as `.npy` files that have to contain data shaped like (num_annotations, embedding_dimension) with dtype float.
To convert this `.npy` file to a logfile, run `bazel run //tensorboard/plugins/npmi:npy_to_embedding_data_demo -- --out_path [path_to_other_logs_for_the_run] --embeddings_path [path_to_your_embeddings_npy_file]`.

### Building the Plugin

To build the plugin, build tensorboard just as you would anyway, using `bazel run tensorboard -- --logdir [your_logdir]`, with the logdir pointing to the directory containing the data exported in the previous step.

### Accessing the Plugin

To make tensorboard load this experimental plugin, append `/?experimentalPlugin=npmi` to your URL (normally this results in `http://localhost:6006/?experimentalPlugin=npmi`).

## Plugin Implementation

This folder contains the backend of the nPMI plugin. The frontend implementation can be found at `tensorboard/webapp/plugins/npmi`.
