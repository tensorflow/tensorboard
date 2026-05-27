echo "Cleaning build directories..."
echo
rm -rf build
rm -rf dist
rm -rf tensorboard_plugin_graph_v2/frontend/build
rm -rf tensorboard_plugin_graph_v2.egg-info

pushd tensorboard_plugin_graph_v2/frontend > /dev/null

echo "-------------------------------------------------------------------------"
echo "Checking Dependencies..."

npm install

echo "-------------------------------------------------------------------------"
echo "Building frontend..."
npm run build

popd > /dev/null

echo
echo "-------------------------------------------------------------------------"
echo "Building backend packages..."
echo
python setup.py bdist_wheel --python-tag py2
python setup.py bdist_wheel --python-tag py3

echo
echo "-------------------------------------------------------------------------"
echo "Plugin built.  You can now install it via:"
echo "pip install dist/tensorboard_plugin_graph_v2-0.0.1-py3-none-any.whl -U"
