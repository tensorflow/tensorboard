import ntpath
import posixpath
import unittest
from unittest import mock
from unittest.mock import MagicMock, Mock, patch

from werkzeug import test
from werkzeug import wrappers
from werkzeug.test import EnvironBuilder

from tensorboard.plugins import base_plugin
from main_plugin import plugin
from tensorboard.plugins.scalar import metadata as scalar_metadata
from main_plugin import metadata
from main_plugin.plugin import System


def is_path_safe(path):
    """Returns the result depending on the plugin's static file handler."""
    example_plugin = plugin.System(base_plugin.TBContext())
    serve_static_file = example_plugin._serve_static_file

    client = test.Client(serve_static_file, wrappers.Response)
    response = client.get(plugin._PLUGIN_DIRECTORY_PATH_PART + path)
    return response.status_code == 200


class TestSystem(unittest.TestCase):

    def setUp(self):
        self.mock_data_provider = MagicMock()

        # Create a mock context
        self.mock_context = MagicMock()
        self.experiment_id = MagicMock()

        # Create an instance of System with the mock data provider and context
        self.system = System(context=MagicMock(data_provider=self.mock_data_provider))

    @patch('main_plugin.plugin.System._serve_tags')
    def test_serve_tags(self, mock_serve_tags):
        mock_request = EnvironBuilder(path='/tags').get_environ()

        self.mock_data_provider.list_scalars.return_value = {
            'run1': ['tag1', 'tag2'],
            'run2': ['tag3']
        }

        response = self.system._serve_tags(mock_request)

        self.mock_data_provider.list_scalars.assert_called_once_with(
            self.mock_context,
            experiment_id=self.experiment_id,
            plugin_name=scalar_metadata.PLUGIN_NAME
        )

        expected_response = {
            'run1': ['tag1', 'tag2'],
            'run2': ['tag3']
        }
        print("response",response.data,expected_response)
        self.assertEqual(response.data, expected_response)
        self.assertEqual(response.status_code, 200)

    def test_path_traversal(self):
        """Properly check whether a URL can be served from the static folder."""
        with mock.patch("builtins.open", mock.mock_open(read_data="data")):
            self.assertTrue(is_path_safe("static/index.js"))
            self.assertTrue(is_path_safe("./static/index.js"))
            self.assertTrue(is_path_safe("static/../static/index.js"))

            self.assertFalse(is_path_safe("../static/index.js"))
            self.assertFalse(is_path_safe("../index.js"))
            self.assertFalse(is_path_safe("static2/index.js"))
            self.assertFalse(is_path_safe("notstatic/index.js"))
            self.assertFalse(is_path_safe("static/../../index.js"))
            self.assertFalse(is_path_safe("..%2findex.js"))
            self.assertFalse(is_path_safe("%2e%2e/index.js"))
            self.assertFalse(is_path_safe("%2e%2e%2findex.js"))
            self.assertFalse(
                is_path_safe(
                    "static/../..\\org_tensorflow_tensorboard\\static\\index.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/../../org_tensorflow_tensorboard/static/index.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/%2e%2e%2f%2e%2e%5corg_tensorflow_tensorboard%5cstatic%5cindex.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/%2e%2e%2f%2e%2e%2forg_tensorflow_tensorboard%2fstatic%2findex.js"
                )
            )

            # Test with OS specific path modules.
            with mock.patch("os.path", posixpath):
                self.assertTrue(is_path_safe("static/\\index.js"))

            with mock.patch("os.path", ntpath):
                self.assertFalse(is_path_safe("static/\\index.js"))


if __name__ == '__main__':
    unittest.main()
