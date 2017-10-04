py_test(
  name = "visualizer_test",
  srcs = [
    "visualizer_test.py", 
    "//tensorboard/plugins/beholder:shared_config.py"
  ],
  deps = [
    "//tensorboard/plugins/beholder:visualizer"
  ],
  srcs_version = "PY2AND3",
)

py_test(
  name = "beholder_test",
  srcs = [
    "beholder_test.py",
    "//tensorboard/plugins/beholder:shared_config.py",
  ],
  deps = [
    "//tensorboard/plugins/beholder:beholder",
    "//tensorboard/plugins/beholder:file_system_tools",
  ],
  srcs_version = "PY2AND3",
)

py_test(
  name = "plugin_test",
  srcs = [
    "plugin_test.py"
  ],
  deps = [
    "@org_tensorflow_tensorboard//tensorboard/backend:application",
    "@org_pocoo_werkzeug",
    "//tensorboard",
  ],
  srcs_version = "PY2AND3",
)
