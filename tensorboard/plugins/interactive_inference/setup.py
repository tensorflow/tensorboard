# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import print_function
from setuptools import setup, find_packages, Command
from setuptools.command.sdist import sdist
from setuptools.command.build_py import build_py
from setuptools.command.egg_info import egg_info
from subprocess import check_call
import os
import sys
import platform
import subprocess

here = os.path.dirname(os.path.abspath(__file__))
node_root = os.path.join(here, 'js')
is_repo = os.path.exists(os.path.join(here, '.git'))

npm_path = os.pathsep.join([
    os.path.join(node_root, 'node_modules', '.bin'),
                os.environ.get('PATH', os.defpath),
])

from distutils import log
log.set_verbosity(log.DEBUG)
log.info('setup.py entered')
log.info('$PATH=%s' % os.environ['PATH'])

LONG_DESCRIPTION = 'What-If Tool jupyter widget'

class BuildWitHtml(Command):
    """Build the vulcanized WIT HTML for the Jupypter extension"""
    description = 'build WIT jupyter HTML for packaging'

    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        command = ['bazel', 'build',
                   'tf_interactive_inference_dashboard:wit_jupyter']
        subprocess.check_call(command)
        command = ['mkdir', '-p', 'witwidget/static']
        subprocess.check_call(command)
        command = [
            'cp', '-f',
            '../../../bazel-genfiles/tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/wit_jupyter.html',
            'witwidget/static/']
        subprocess.check_call(command)


def js_prerelease(command, strict=False):
    """decorator for building minified js/css prior to another command"""
    class DecoratedCommand(command):
        def run(self):
            jsdeps = self.distribution.get_command_obj('jsdeps')
            if not is_repo and all(os.path.exists(t) for t in jsdeps.targets):
                # sdist, nothing to do
                command.run(self)
                return

            try:
                self.distribution.run_command('jsdeps')
            except Exception as e:
                missing = [t for t in jsdeps.targets if not os.path.exists(t)]
                if strict or missing:
                    log.warn('rebuilding js and css failed')
                    if missing:
                        log.error('missing files: %s' % missing)
                    raise e
                else:
                    log.warn('rebuilding js and css failed (not a problem)')
                    log.warn(str(e))
            command.run(self)
            update_package_data(self.distribution)
    return DecoratedCommand

def update_package_data(distribution):
    """update package_data to catch changes during setup"""
    build_py = distribution.get_command_obj('build_py')
    # distribution.package_data = find_package_data()
    # re-init build_py options which load package_data
    build_py.finalize_options()


class NPM(Command):
    description = 'install package.json dependencies using npm'

    user_options = []

    node_modules = os.path.join(node_root, 'node_modules')

    targets = [
        os.path.join(here, 'witwidget', 'static', 'extension.js'),
        os.path.join(here, 'witwidget', 'static', 'index.js'),
        os.path.join(here, 'witwidget', 'static', 'wit_jupyter.html'),
    ]

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def get_npm_name(self):
        npmName = 'npm';
        if platform.system() == 'Windows':
            npmName = 'npm.cmd';
            
        return npmName;
    
    def has_npm(self):
        npmName = self.get_npm_name();
        try:
            check_call([npmName, '--version'])
            return True
        except:
            return False

    def should_run_npm_install(self):
        package_json = os.path.join(node_root, 'package.json')
        node_modules_exists = os.path.exists(self.node_modules)
        return self.has_npm()

    def run(self):
        has_npm = self.has_npm()
        if not has_npm:
            log.error("`npm` unavailable.  If you're running this command using sudo, make sure `npm` is available to sudo")

        env = os.environ.copy()
        env['PATH'] = npm_path

        if self.should_run_npm_install():
            log.info("Installing build dependencies with npm.  This may take a while...")
            npmName = self.get_npm_name();
            check_call([npmName, 'install'], cwd=node_root, stdout=sys.stdout, stderr=sys.stderr)
            os.utime(self.node_modules, None)

        for t in self.targets:
            if not os.path.exists(t):
                msg = 'Missing file: %s' % t
                if not has_npm:
                    msg += '\nnpm is required to build a development version of a widget extension'
                raise ValueError(msg)

        # update package data in case this created new files
        update_package_data(self.distribution)

version_ns = {}
with open(os.path.join(here, 'witwidget', '_version.py')) as f:
    exec(f.read(), {}, version_ns)

setup_args = {
    'name': 'witwidget',
    'version': version_ns['__version__'],
    'description': 'What-If Tool jupyter widget',
    'long_description': LONG_DESCRIPTION,
    'include_package_data': True,
    'data_files': [
        ('share/jupyter/nbextensions/wit-widget', [
            'witwidget/static/extension.js',
            'witwidget/static/index.js',
            'witwidget/static/index.js.map',
            'witwidget/static/wit_jupyter.html',
        ],),
        ('etc/jupyter/nbconfig/notebook.d/' ,['wit-widget.json'])
    ],
    'install_requires': [
        'ipywidgets>=7.0.0',
        'jupyter>=1.0,<2',
        'tensorflow>=1.12.0',
        'tensorflow-serving-api>=1.12.0'
    ],
    'packages': find_packages(),
    'zip_safe': False,
    'cmdclass': {
        'build_wit': BuildWitHtml,
        'build_py': js_prerelease(build_py),
        'egg_info': js_prerelease(egg_info),
        'sdist': js_prerelease(sdist, strict=True),
        'jsdeps': NPM,
    },

    'author': 'Google LLC',
    'author_email': '',
    'url': 'https://github.com/tensorflow/tensorboard/tensorboard/plugins/interactive_inference',
    'keywords': [
        'ipython',
        'jupyter',
        'widgets',
    ],
    'license': 'Apache 2.0',
    'classifiers': [
        'Development Status :: 4 - Beta',
        'Framework :: IPython',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Multimedia :: Graphics',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
}

setup(**setup_args)
