from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard.plugins import base_plugin


class LitePluginLoader(base_plugin.TBLoader):
  """InteractiveInferencePlugin factory.

  This class checks for `tensorflow` install and dependency.
  """

  def load(self, context):
    """Returns the plugin, if possible.

    Args:
      context: The TBContext flags.

    Returns:
      A InteractiveInferencePlugin instance or None if it couldn't be loaded.
    """
    try:
      # pylint: disable=g-import-not-at-top,unused-import
      import tensorflow
      from tensorboard.plugins.lite.lite_plugin import lite_backend
      if not lite_backend.is_supported:
      	return
    except ImportError:
      return

    # pylint: disable=line-too-long,g-import-not-at-top
    from tensorboard.plugins.lite.lite_plugin import LitePlugin
    return LitePlugin(context)