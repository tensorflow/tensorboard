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

popd > /dev/null

echo "-------------------------------------------------------------------------"
echo "Linking backend package..."
echo
python setup.py develop
echo "Use 'python setup.py develop --uninstall' to remove the plugin."

echo
echo "========================================================================="
echo "**  The frontend will be rebuilt on any file change.                   **"
echo "**  To expose the updated frontend in a live TensorBoard instance, do  **"
echo "**  this before starting TensorBoard:                                  **"
echo
echo export TENSORBOARD_GRAPH_V2_PATH=`pwd`/tensorboard_plugin_graph_v2/frontend/dist/frontend
echo
echo "========================================================================="
echo

pushd tensorboard_plugin_graph_v2/frontend > /dev/null
npm run watch
popd > /dev/null

