"""Shared utils among inference plugins."""

import collections
import copy
import stat
import numpy as np
from six.moves import zip  # pylint: disable=redefined-builtin

import tensorflow as tf

from tensorboard.plugins.inference.utils import inference_pb2
from tensorflow.serving.apis import classification_pb2
from tensorflow.serving.apis import prediction_service_pb2
from tensorflow.serving.apis import regression_pb2


class VizParams(object):
  """Light-weight class for holding UI state.

  Attributes:
    x_min: The minimum value to use to generate mutants for the feature
      (as specified the user on the UI).
    x_max: The maximum value to use to generate mutants for the feature
      (as specified the user on the UI).
    examples_path: A string CNS path.
    num_examples_to_scan: Int number of examples to scan along `examples_path`
      in order to generate statistics for mutants.
    num_mutants: Int number of mutants to generate per chart.
    feature_index_pattern: String that specifies a restricted set of indices
      of the feature to generate mutants for (useful for features that is a
      long repeated field. See `convert_pattern_to_indices` for more details.
  """

  def __init__(self, x_min, x_max, examples_path, num_examples_to_scan,
               num_mutants, feature_index_pattern):
    """Inits VizParams may raise InvalidUserInputError for bad user inputs."""

    def to_float_or_none(x):
      try:
        return float(x)
      except (ValueError, TypeError):
        return None

    def to_int(x):
      try:
        return int(x)
      except (ValueError, TypeError) as e:
        raise InvalidUserInputError(e)

    def convert_pattern_to_indices(pattern):
      """Converts a printer-page-style pattern and returns a list of indices.

      Args:
        pattern: A printer-page-style pattern with only numeric characters,
          commas, dashes, and optionally spaces.

      For example, a pattern of '0,2,4-6' would yield [0, 2, 4, 5, 6].

      Returns:
        A list of indices represented by the pattern.
      """
      pieces = [token.strip() for token in pattern.split(',')]
      indices = []
      for piece in pieces:
        try:
          if '-' in piece:
            lower, upper = [int(x.strip()) for x in piece.split('-')]
            indices.extend(range(lower, upper + 1))
          else:
            indices.append(int(piece.strip()))
        except ValueError as e:
          raise InvalidUserInputError(e)
      return sorted(indices)

    self.x_min = to_float_or_none(x_min)
    self.x_max = to_float_or_none(x_max)
    self.examples_path = examples_path
    self.num_examples_to_scan = to_int(num_examples_to_scan)
    self.num_mutants = to_int(num_mutants)

    # By default, there are no specific user-requested feature indices.
    self.feature_indices = []
    if feature_index_pattern:
      self.feature_indices = convert_pattern_to_indices(feature_index_pattern)


class OriginalFeatureList(object):
  """Light-weight class for holding the original values in the example.

  Should not be created by hand, but rather generated via
  `parse_original_feature_from_example`. Just used to hold inferred info
  about the example.

  Attributes:
    feature_name: String name of the feature.
    original_value: The value of the feature in the original tf.Example.
    feature_type: One of ['int64_list', 'float_list'].

  Raises:
    ValueError: If OriginalFeatureList fails init validation.
  """

  def __init__(self, feature_name, original_value, feature_type):
    """Inits OriginalFeatureList."""
    self.feature_name = feature_name
    self.original_value = original_value
    self.feature_type = feature_type

    # Derived attributes.
    self.length = sum(1 for _ in original_value)


class MutantFeatureValue(object):
  """Light-weight class for holding mutated values in the example.

  Should not be created by hand but rather generated via `make_mutant_features`.

  Used to represent a "mutant example": an example that is mostly identical to
  the user-provided original example, but has one feature that is different.

  Attributes:
    original_feature: An `OriginalFeatureList` object representing the feature
      to create mutants for.
    index: The index of the feature to create mutants for. The feature can be
      a repeated field, and we want to plot mutations of its various indices.
    mutant_value: The proposed mutant value for the given index.

  Raises:
    ValueError: If MutantFeatureValue fails init validation.
  """

  def __init__(self, original_feature, index, mutant_value):
    """Inits MutantFeatureValue."""
    if not isinstance(original_feature, OriginalFeatureList):
      raise ValueError(
          'original_feature should be `OriginalFeatureList`, but had '
          'unexpected type: {}'.format(type(original_feature)))
    self.original_feature = original_feature

    if index is not None and not isinstance(index, int):
      raise ValueError(
          'index should be None or int, but had unexpected type: {}'.format(
              type(index)))
    self.index = index
    self.mutant_value = mutant_value


class ServingBundle(object):
  """Light-weight class for holding info to make the inference request.

  Attributes:
    inference_address: A local address or blade address to send inference
      requests to.
    model_name: The Servo model name.
    model_type: One of ['classification', 'regression'].

  Raises:
    ValueError: If ServingBundle fails init validation.
  """

  def __init__(self, inference_address, model_name, model_type):
    """Inits ServingBundle."""
    if not isinstance(inference_address, basestring):
      raise ValueError('Invalid inference_address has type: {}'.format(
          type(inference_address)))
    # Clean the inference_address so that SmartStub likes it.
    self.inference_address = inference_address.replace('http://', '').replace(
        'https://', '')

    if not isinstance(model_name, basestring):
      raise ValueError('Invalid model_name has type: {}'.format(
          type(model_name)))
    self.model_name = model_name

    if model_type not in ['classification', 'regression']:
      raise ValueError('Invalid model_type: {}'.format(model_type))
    self.model_type = model_type


class InvalidUserInputError(Exception):
  """An exception to throw if user input is detected to be invalid.

  Attributes:
    original_exception: The triggering `Exception` object to be wrapped, or
      a string.
  """

  def __init__(self, original_exception):
    """Inits InvalidUserInputError."""
    self.original_exception = original_exception
    Exception.__init__(self)

  @property
  def message(self):
    return 'InvalidUserInputError: ' + str(self.original_exception)


def proto_value_for_feature(example, feature_name):
  """Get the value of a feature from tf.Example regardless of feature type."""
  feature = example.features.feature[feature_name]
  feature_type = feature.WhichOneof('kind')
  if feature_type is None:
    raise ValueError('Feature {} on example proto has no declared type.'.format(
        feature_name))
  return getattr(feature, feature_type).value


def parse_original_feature_from_example(example, feature_name):
  """Returns an `OriginalFeatureList` for the specified feature_name.

  Args:
    example: A tf.Example.
    feature_name: A string feature name.

  Returns:
    A filled in `OriginalFeatureList` object representing the feature.
  """
  feature = example.features.feature[feature_name]
  feature_type = feature.WhichOneof('kind')
  original_value = proto_value_for_feature(example, feature_name)

  return OriginalFeatureList(feature_name, original_value, feature_type)


def filepath_to_filepath_list(file_path):
  """Returns a list of files given by a filepath.

  Args:
    file_path: A path, possibly representing a single file, or containing a
        wildcard or sharded path.

  Returns:
    A list of files represented by the provided path.
  """
  file_path = file_path.strip()
  return [file_path]
  #if '@' in file_path:
  #  return gfile.GenerateShardedFilenames(file_path)
  #elif '*' in file_path:
  #  return gfile.Glob(file_path)
  #else:
  #  return [file_path]


def throw_if_file_access_not_allowed(file_path, logdir, has_auth_group):
  """Throws an error if a file cannot be loaded for inference.

  Args:
    file_path: A file path.
    logdir: The path to the logdir of the TensorBoard context.
    has_auth_group: True if TensorBoard was started with an authorized group,
        in which case we allow access to all visible files.

  Raises:
    InvalidUserInputError: If the file is not in the logdir and is not globally
        readable.
  """
  return
  #file_paths = filepath_to_filepath_list(file_path)
  #if not file_paths:
  #  raise InvalidUserInputError(file_path + ' contains no files')
  #if has_auth_group:
  #  return

  #for path in file_paths:
  #  # Check if the file is inside the logdir.
  #  if not path.startswith(logdir):
  #    try:
  #      filestat = gfile.Stat(path, stat_proto=False)
  #      # Check for world-readable mode flag on the file to open.
  #      if not filestat.mode & stat.S_IROTH:
  #        raise InvalidUserInputError(
  #            path + ' is not inside the TensorBoard logdir or have global '
  #            + 'read permissions.')
  #    except (gfile.GOSError, gfile.FileError) as e:
  #      raise InvalidUserInputError(e)


def example_protos_from_cns_path(cns_path,
                                 num_examples=10,
                                 start_index=0,
                                 parse_examples=True):
  """Returns a number of tf.Examples from the CNS path.

  Args:
    cns_path: A string CNS path.
    num_examples: The maximum number of examples to return from the path.
    start_index: The index of the first example to return.
    parse_examples: If true then parses the serialized proto from the path into
        proto objects. Defaults to True.

  Returns:
    A list of `tf.Example` protos or serialized proto strings at the CNS path.

  Raises:
    InvalidUserInputError: If examples cannot be procured from cns_path.
  """

  def append_examples_from_iterable(iterable, examples):
    for i, value in enumerate(iterable):
      if i >= start_index:
        examples.append(
            tf.Example.FromString(value) if parse_examples else value)
        if len(examples) >= num_examples:
          return

  filenames = filepath_to_filepath_list(cns_path)
  examples = []
  try:
    # Try RecordIO format after trying all other input formats, because
    # RecordIO opens non-RecordIO formats as "0 records".
    for filename in filenames:
      record_iterator = tf.python_io.tf_record_iterator(path=filename)
      append_examples_from_iterable(record_iterator, examples)
      if len(examples) >= num_examples:
        break
  except IOError as e:
    raise InvalidUserInputError(e)

  #try:
  #  # Try SSTable format first.
  #  table = sstable.MergedSSTable(filenames)
  #  append_examples_from_iterable(table.values(), examples)
  #except sstable.SSTableOpenError as e:
  #  try:
  #    # Try RecordIO format after trying all other input formats, because
  #    # RecordIO opens non-RecordIO formats as "0 records".
  #    for filename in filenames:
  #      with recordio.RecordReader(filename) as reader:
  #        append_examples_from_iterable(reader, examples)
  #        if len(examples) >= num_examples:
  #          break
  #  except IOError as e:
  #    raise InvalidUserInputError(e)

  if examples:
    return examples
  else:
    raise InvalidUserInputError('No tf.Examples found at ' + cns_path +
                                '. Valid formats are SSTable and RecordIO.')


def wrap_inference_results(inference_result_proto):
  """Returns packaged inference results from the provided proto.

  Args:
    inference_result_proto: The classification or regression response proto.

  Returns:
    An InferenceResult proto with the result from the response.
  """
  inference_proto = inference_pb2.InferenceResult()
  if isinstance(inference_result_proto,
                classification_pb2.ClassificationResponse):
    inference_proto.classification.CopyFrom(inference_result_proto.result)
  elif isinstance(inference_result_proto, regression_pb2.RegressionResponse):
    inference_proto.regression.CopyFrom(inference_result_proto.result)
  return inference_proto


def get_numeric_feature_names(example):
  """Returns a list of feature names for float and int64 type features.

  Args:
    example: A tf.Example.

  Returns:
    A list of string feature names.
  """
  numeric_features = ('float_list', 'int64_list')
  features = example.features.feature
  return sorted([
      feature_name for feature_name in features
      if features[feature_name].WhichOneof('kind') in numeric_features
  ])


def get_categorical_feature_names(example):
  """Returns a list of feature names for byte type features.

  Args:
    example: A tf.Example.

  Returns:
    A list of categorical feature names (e.g. ['education', 'marital_status'] )
  """
  features = example.features.feature
  return sorted([
      feature_name for feature_name in features
      if features[feature_name].WhichOneof('kind') == 'bytes_list'
  ])


def get_numeric_features_to_observed_range(examples_path, num_examples):
  """Returns numerical features and their observed ranges.

  Args:
    examples_path: A string CNS path.
    num_examples: Number of examples to read from examples_path.

  Returns:
    A dict mapping feature_name -> {'observedMin': 'observedMax': } dicts,
    with a key for each numerical feature.
  """
  examples = example_protos_from_cns_path(examples_path, num_examples)
  observed_features = collections.defaultdict(list)  # name -> [value, ]
  for example in examples:
    for feature_name in get_numeric_feature_names(example):
      original_feature = parse_original_feature_from_example(
          example, feature_name)
      observed_features[feature_name].extend(original_feature.original_value)
  return {
      feature_name: {
          'observedMin': min(feature_values),
          'observedMax': max(feature_values),
      }
      for feature_name, feature_values in observed_features.iteritems()
  }


#@memoize.Memoize()
def get_categorical_features_to_sampling(examples_path, num_examples, top_k):
  """Returns categorical features and a sampling of their most-common values.

  The results of this slow function are used by the visualization repeatedly,
  so the results are cached.

  Args:
    examples_path: A string CNS path.
    num_examples: Number of examples to read from examples_path.
    top_k: Max number of samples to return per feature.

  Returns:
    A dict of feature_name -> {'samples': ['Married-civ-spouse',
      'Never-married', 'Divorced']}.

    There is one key for each categorical feature.

    Currently, the inner dict just has one key, but this structure leaves room
    for further expansion, and mirrors the structure used by
    `get_numeric_features_to_observed_range`.
  """
  examples = example_protos_from_cns_path(examples_path, num_examples)
  observed_features = collections.defaultdict(list)  # name -> [value, ]
  for example in examples:
    for feature_name in get_categorical_feature_names(example):
      original_feature = parse_original_feature_from_example(
          example, feature_name)
      observed_features[feature_name].append(
          str(original_feature.original_value))

  result = {}
  for feature_name, feature_values in sorted(observed_features.iteritems()):
    samples = [
        word
        for word, _ in collections.Counter(feature_values).most_common(top_k)
    ]
    result[feature_name] = {'samples': samples}
  return result


def make_mutant_features(original_feature, index_to_mutate, viz_params):
  """Return a list of `MutantFeatureValue`s that are variants of original."""
  lower = viz_params.x_min
  upper = viz_params.x_max
  examples_path = viz_params.examples_path
  num_examples_to_scan = viz_params.num_examples_to_scan
  num_mutants = viz_params.num_mutants

  if original_feature.feature_type == 'float_list':
    return [
        MutantFeatureValue(original_feature, index_to_mutate, value)
        for value in np.linspace(lower, upper, num_mutants)
    ]
  elif original_feature.feature_type == 'int64_list':
    mutant_values = np.linspace(int(lower), int(upper),
                                num_mutants).astype(int).tolist()
    # Remove duplicates that can occur due to integer constraint.
    mutant_values = sorted(set(mutant_values))
    return [
        MutantFeatureValue(original_feature, index_to_mutate, value)
        for value in mutant_values
    ]
  elif original_feature.feature_type == 'bytes_list':
    feature_to_samples = get_categorical_features_to_sampling(
        examples_path, num_examples_to_scan, num_mutants)

    # `mutant_values` looks like:
    # [['Married-civ-spouse'], ['Never-married'], ['Divorced'], ['Separated']]
    mutant_values = feature_to_samples[original_feature.feature_name]['samples']
    return [
        MutantFeatureValue(original_feature, None, value)
        for value in mutant_values
    ]
  else:
    raise ValueError('Malformed original feature had type of: ' +
                     original_feature.feature_type)


def make_mutant_tuples(example_proto, original_feature, index_to_mutate,
                       viz_params):
  """Return a list of `MutantFeatureValue`s and a list of mutant `tf.Examples`.

  Args:
    example_proto: The tf.Example to mutate.
    original_feature: A `OriginalFeatureList` that encapsulates the feature to
      mutate.
    index_to_mutate: The index of the int64_list or float_list to mutate.
    viz_params: A `VizParams` object that contains the UI state of the request.

  Returns:
    A list of `MutantFeatureValue`s and a list of mutant `tf.Examples`.
  """
  mutant_features = make_mutant_features(original_feature, index_to_mutate,
                                         viz_params)
  mutant_examples = []
  for mutant_feature in mutant_features:
    copied_example = copy.deepcopy(example_proto)
    feature_name = mutant_feature.original_feature.feature_name

    feature_list = proto_value_for_feature(copied_example, feature_name)
    if index_to_mutate is None:
      new_values = mutant_feature.mutant_value
    else:
      new_values = list(feature_list)
      new_values[index_to_mutate] = mutant_feature.mutant_value

    del feature_list[:]
    feature_list.extend(new_values)
    mutant_examples.append(copied_example)

  return mutant_features, mutant_examples


def mutant_charts_for_feature(example_proto, feature_name, serving_bundle,
                              viz_params):
  """Returns JSON formatted for rendering all charts for a feature.

  Args:
    example_proto: The tf.Example proto to mutate.
    feature_name: The string feature name to mutate.
    serving_bundle: A `ServingBundle` object that contains the information to
      make the serving request.
    viz_params: A `VizParams` object that contains the UI state of the request.

  Raises:
    InvalidUserInputError if `viz_params.feature_index_pattern` requests out of
    range indices for `feature_name` within `example_proto`.

  Returns:
    A JSON-able dict for rendering a single mutant chart.  parsed in
    `tf-inference-dashboard.html`.
    {
      'chartType': 'numeric', # oneof('numeric', 'categorical')
      'data': [A list of data] # parseable by vz-line-chart or vz-bar-chart
    }
  """

  def chart_for_index(index_to_mutate):
    mutant_features, mutant_examples = make_mutant_tuples(
        example_proto, original_feature, index_to_mutate, viz_params)

    inference_result_proto = call_servo(mutant_examples, serving_bundle)
    return make_json_formatted_for_single_chart(mutant_features,
                                                inference_result_proto)

  original_feature = parse_original_feature_from_example(
      example_proto, feature_name)

  if original_feature.feature_type == 'bytes_list':
    return {'chartType': 'categorical', 'data': [chart_for_index(None)]}
  else:
    # For numerical features, we should create a mutant for each index.
    indices_to_mutate = viz_params.feature_indices or xrange(
        original_feature.length)
    try:
      return {
          'chartType':
              'numeric',
          'data': [
              chart_for_index(index_to_mutate)
              for index_to_mutate in indices_to_mutate
          ]
      }
    except IndexError as e:
      raise InvalidUserInputError(e)


def call_servo(examples, serving_bundle):
  """Send an RPC request to the Servomatic prediction service.

  Args:
    examples: A list of tf.Examples that matches the model spec.
    serving_bundle: A `ServingBundle` object that contains the information to
      make the serving request.

  Returns:
    A ClassificationResponse or RegressionResponse proto.
  """
  return None
  # if serving_bundle.model_type == 'classification':
  #   request = classification_pb2.ClassificationRequest()
  # if serving_bundle.model_type == 'regression':
  #   request = regression_pb2.RegressionRequest()
  # request.model_spec.name = serving_bundle.model_name
  # request.input.example_list.examples.extend(examples)

  # smart_service = pywrapsmart_service.ParseSmartServiceOrNameListOrDie(
  #     serving_bundle.inference_address)
  # stub = pywrapsmart_stub.NewSmartStub(prediction_service_pb2.PredictionService,
  #                                      smart_service)

  # rpc = pywraprpc.RPC()
  # try:
  #   if serving_bundle.model_type == 'classification':
  #     response = stub.Classify(request, rpc=rpc)
  #   if serving_bundle.model_type == 'regression':
  #     response = stub.Regress(request, rpc=rpc)
  #   return response
  # except pywraprpc.RPCException as e:
  #   raise InvalidUserInputError(e)


def make_json_formatted_for_single_chart(mutant_features,
                                         inference_result_proto):
  """Returns JSON formatted for a single mutant chart.

  Args:
    mutant_features: An iterable of `MutantFeatureValue`s representing the
      X-axis.
    inference_result_proto: A ClassificationResponse or RegressionResponse
      returned by Servo, representing the Y-axis.
      It contains one 'classification' or 'regression' for every tf.Example that
      was sent for inference. The length of that field should be the same length
      of mutant_features.

  Returns:
    A JSON-able dict for rendering a single mutant chart, parseable by
    `vz-line-chart` or `vz-bar-chart`.
  """
  x_label = 'step'
  y_label = 'scalar'
  points = []

  if isinstance(inference_result_proto,
                classification_pb2.ClassificationResponse):
    # classification_label -> [{x_label: y_label:}]
    series = collections.defaultdict(list)

    # ClassificationResponse has a separate probability for each label
    assert len(mutant_features) == len(
        inference_result_proto.result.classifications)
    for mutant_feature, classification in zip(
        mutant_features, inference_result_proto.result.classifications):
      for classification_class in classification.classes:
        # Special case to not include the "0" class in binary classification.
        # Since that just results in a chart that is symmetric around 0.5.
        if len(
            classification.classes) == 2 and classification_class.label == '0':
          continue
        series[classification_class.label].append({
            x_label: mutant_feature.mutant_value,
            y_label: classification_class.score,
        })

    # Post-process points to have separate list for each class
    for points in series.values():
      points.sort(key=lambda p: p[x_label])
    return series

  elif isinstance(inference_result_proto, regression_pb2.RegressionResponse):
    assert len(mutant_features) == len(
        inference_result_proto.result.regressions)

    for mutant_feature, regression in zip(
        mutant_features, inference_result_proto.result.regressions):
      points.append({
          x_label: mutant_feature.mutant_value,
          y_label: regression.value
      })
    return {'value': points}

  else:
    raise NotImplementedError('Only classification and regression implemented.')
