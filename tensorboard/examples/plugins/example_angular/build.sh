echo "Cleaning build directories..."
echo
rm -rf build
rm -rf dist
rm -rf tensorboard_plugin_angular/frontend/build
rm -rf tensorboard_plugin_angular.egg-info

pushd tensorboard_plugin_angular/frontend > /dev/null

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
echo "Installing plugin..."
echo
# optional
pip install dist/tensorboard_plugin_angular-0.0.1-py3-none-any.whl -U
