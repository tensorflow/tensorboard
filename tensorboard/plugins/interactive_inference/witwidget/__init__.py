from ._version import version_info, __version__

from .wit import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'wit-widget',
        'require': 'wit-widget/extension'
    }]
