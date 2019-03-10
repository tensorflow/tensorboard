# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""TensorFlow component package for providing tf.summary from TensorBoard."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

# Keep this import outside the function below for internal sync reasons.
import tensorflow as tf

def reexport_tf_summary():
  """Re-export all symbols from the original tf.summary.

  This function finds the original tf.summary V2 API and re-exports all the
  symbols from it within this module as well, so that when this module is
  patched into the TF API namespace as the new tf.summary, the effect is an
  overlay that just adds TensorBoard-provided symbols to the module.

  Finding the original tf.summary V2 API module reliably is a challenge, since
  this code runs *during* the overall TF API import process and depending on
  the order of imports (which is subject to change), different parts of the API
  may or may not be defined at the point in time we attempt to access them. This
  code also may be inserted into two places in the API (tf and tf.compat.v2)
  and may be re-executed multiple times even for the same place in the API (due
  to the TF module import system not populating sys.modules properly), so it
  needs to be robust to many different scenarios.

  The one constraint we can count on is that everywhere this module is loaded
  (via the component_api_helper mechanism in TF), it's going to be the 'summary'
  submodule of a larger API package that already has a 'summary' attribute
  that contains the TF-only summary API symbols we need to re-export. This
  may either be the original TF-only summary module (the first time we load
  this module) or a pre-existing copy of this module (if we're re-loading this
  module again). We don't actually need to differentiate those two cases,
  because it's okay if we re-import our own TensorBoard-provided symbols; they
  will just be overwritten later on in this file.

  So given that guarantee, the approach we take is to first attempt to locate
  a TF V2 API package that already has a 'summary' attribute (most likely this
  is the parent package into which we're being imported, but not necessarily),
  and then do the dynamic version of "from tf_api_package.summary import *".

  Lastly, this logic is encapsulated in a function to avoid symbol leakage.
  """
  import sys  # pylint: disable=g-import-not-at-top

  # API packages to check for the original V2 summary API, in preference order
  # to avoid going "under the hood" to the _api packages unless necessary.
  packages = [
      'tensorflow',
      'tensorflow.compat.v2',
      'tensorflow._api.v2',
      'tensorflow._api.v2.compat.v2',
      'tensorflow._api.v1.compat.v2',
  ]
  # If we aren't sure we're on V2, don't use tf.summary since it could be V1.
  # Note there may be false positives since the __version__ attribute may not be
  # defined at this point in the import process.
  if not getattr(tf, '__version__', '').startswith('2.'):  # noqa: F821
    packages.remove('tensorflow')

  def dynamic_wildcard_import(module):
    """Implements the logic of "from module import *" for the given module."""
    symbols = getattr(module, '__all__', None)
    if symbols is None:
      symbols = [k for k in module.__dict__.keys() if not k.startswith('_')]
    globals().update({symbol: getattr(module, symbol) for symbol in symbols})

  notfound = object()  # sentinel value
  for package_name in packages:
    package = sys.modules.get(package_name, notfound)
    if package is notfound:
      # Either it isn't in this installation at all (e.g. the _api.vX packages
      # are only in API version X), it isn't imported yet, or it was imported
      # but not inserted into sys.modules under its user-facing name (for the
      # non-'_api' packages), at which point we continue down the list to look
      # "under the hood" for it via its '_api' package name.
      continue
    module = getattr(package, 'summary', None)
    if module is None:
      # This happens if the package hasn't been fully imported yet. For example,
      # the 'tensorflow' package won't yet have 'summary' attribute if we are
      # loading this code via the 'tensorflow.compat...' path and 'compat' is
      # imported before 'summary' in the 'tensorflow' __init__.py file.
      continue
    # Success, we hope. Import all the public symbols into this module.
    dynamic_wildcard_import(module)
    return

reexport_tf_summary()

from tensorboard.summary.v2 import audio
from tensorboard.summary.v2 import histogram
from tensorboard.summary.v2 import image
from tensorboard.summary.v2 import scalar
from tensorboard.summary.v2 import text

del absolute_import, division, print_function, tf, reexport_tf_summary
