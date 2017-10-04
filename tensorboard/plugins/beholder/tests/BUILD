py_test(
  name = "visualizer_test",
  srcs = [
    "visualizer_test.py", 
    "//beholder:shared_config.py"
  ],
  deps = [
    "//beholder:visualizer"
  ],
  srcs_version = "PY2AND3",
)

py_test(
  name = "beholder_test",
  srcs = [
    "beholder_test.py",
    "//beholder:shared_config.py",
  ],
  deps = [
    "//beholder:beholder",
    "//beholder:file_system_tools",
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
    "//beholder/tensorboard_x",
  ],
  srcs_version = "PY2AND3",
)
