import os
import json
from tensorboard.plugins import base_plugin
from tensorboard import plugin_util
from tensorboard.data import provider

import werkzeug
from werkzeug import wrappers,exceptions

from main_plugin import metadata



class MyPlugin(base_plugin.TBPlugin):
    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        self.data_provider = context.data_provider
        # self.multiplexer = context.multiplexer
        pass

    def get_plugin_apps(self):
        return { "/index.js": self._serve_js,
                "/chart.js": self._serve_chart_js,
                "/tags":self._serve_tags,
                 "/greetings": self._serve_greetings }
    
    def is_active(self):
        return True

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(es_module_path="/index.js", tab_name="New Ml Visual")
    

    @wrappers.Request.application
    def _serve_tags(self,request):
        # Handle the routes
        pass

    @wrappers.Request.application
    def _serve_js(self,request):
        del request  # unused
        filepath = os.path.join(os.path.dirname(__file__), "static", "index.js")
        with open(filepath) as infile:
            contents = infile.read()
        return werkzeug.Response(contents, content_type="text/javascript")
    
    @wrappers.Request.application
    def _serve_chart_js(self,request):
        del request  # unused
        filepath = os.path.join(os.path.dirname(__file__), "static", "chart.js")
        with open(filepath) as infile:
            contents = infile.read()
        return werkzeug.Response(contents, content_type="text/javascript")

    @wrappers.Request.application
    def _serve_greetings(self,request):
        run = request.args.get("run")
        tag = request.args.get("tag")
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)

        if run is None or tag is None:
            raise werkzeug.exceptions.BadRequest("Must specify run and tag")
        read_result = self.data_provider.read_tensors(
            ctx,
            downsample=1000,
            plugin_name=metadata.PLUGIN_NAME,
            experiment_id=experiment,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )

        data = read_result.get(run, {}).get(tag, [])
        if not data:
            raise exceptions.BadRequest("Invalid run or tag")
        event_data = [datum.numpy.item().decode("utf-8") for datum in data]

        contents = json.dumps(event_data, sort_keys=True)
        return werkzeug.Response(contents, content_type="application/json")


    def preprocess_data(self):
        pass


# This is optional for taking custom flags when running the log files
# class MyLoader(base_plugin.TBLoader):
#     def define_flags(self, parser):
#         parser.add_argument_group('custom').add_argument('--enable_my_extras')
    
#     def fix_flags(self, flags):
#         if flags.enable_my_extras:
#             raise ValueError('Extras not ready')
    
#     def load(self, context):
#         return MyPlugin(context)