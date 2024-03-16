import os
import json
import mimetypes
import werkzeug

from tensorboard.plugins import base_plugin
from tensorboard import plugin_util
from tensorboard.data import provider
from tensorboard.backend import http_util
from tensorboard import errors
from tensorboard import program

from werkzeug import wrappers
from main_plugin import metadata
from tensorboard.plugins.scalar import metadata as scalar_metadata

_PLUGIN_DIRECTORY_PATH_PART = "/data/plugin/custom_plugin/"


class MyPlugin(base_plugin.TBPlugin):
    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        self.data_provider = context.data_provider
        self.multiplexer = context.multiplexer

    def get_plugin_apps(self):
        return {
            "/static/*": self._serve_static_file,
            "/tags": self._serve_tags,
            "/systerm_performance": self._serve_greetings,
        }

    def is_active(self):

        if self.data_provider:
            print("self.data_provider = ", self.data_provider)
            return True
        return False

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            es_module_path="/static/index.js", tab_name="Custom Plugin"
        )

    #Retrieves information about tags associated with the plugin's data and returns it in JSON format.
    @wrappers.Request.application
    def _serve_tags(self, request):

        print("Serve tags is running.....")
    
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        print("data_provider =",self.data_provider)
        run_tag_mapping = self.data_provider.list_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=scalar_metadata.PLUGIN_NAME,
        )
        print("run_tag_mapping",run_tag_mapping)
        run_info = {run: list(tags) for (run, tags) in run_tag_mapping.items()}
        print("run_info",run_info)

        return http_util.Respond(request, run_info, "application/json")

    # For Providing the static files to tensorboard IFrame
    @wrappers.Request.application
    def _serve_static_file(self, request):
        static_path_part = request.path[len(_PLUGIN_DIRECTORY_PATH_PART) :]
        print(static_path_part)
        resource_name = os.path.normpath(
            os.path.join(*static_path_part.split("/"))
        )

        if not resource_name.startswith("static" + os.path.sep):
            return http_util.Respond(
                request, "Not found", "text/plain", code=404
            )

        resource_path = os.path.join(os.path.dirname(__file__), resource_name)
        with open(resource_path, "rb") as read_file:
            mimetype = mimetypes.guess_type(resource_path)[0]
            return http_util.Respond(
                request, read_file.read(), content_type=mimetype
            )

    @wrappers.Request.application
    def _serve_greetings(self, request):
        run = request.args.get("run")
        tag = request.args.get("tag")
        print("run= " ,run)
        print("tag=",tag)
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)

        if run is None or tag is None:
            raise werkzeug.exceptions.BadRequest("Must specify run and tag")
        read_result = self.data_provider.read_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=scalar_metadata.PLUGIN_NAME,
            downsample=5000,
            run_tag_filter=provider.RunTagFilter(runs=[run], tags=[tag]),
        )
        print("read_result=",read_result)
        print(type(read_result))

        scalars = read_result.get(run, {}).get(tag, None)
        if scalars is None:
            raise errors.NotFoundError(
                "No scalar data for run=%r, tag=%r" % (run, tag)
            )
        body = [(x.wall_time, x.step, x.value) for x in scalars]
        return http_util.Respond(request, body, "application/json")
        # serialized_result = {}
        # for key, value in read_result.items():
        #     serialized_result[key] = {}
        #     for inner_key, inner_value in value.items():
        #         serialized_result[key][inner_key] = [(x.wall_time, x.step, x.value)]
        # result_json = json.dumps(read_result)


        # scalars = read_result.get(run, {}).get(tag, None)
        # if scalars is None:
        #     raise errors.NotFoundError(
        #         "No scalar data for run=%r, tag=%r" % (run, tag)
        #     )
        # return [(x.wall_time, x.step, x.value) for x in scalars]
        return werkzeug.Response(str(read_result), content_type="text/plain")


        # run_info = {run: list(tags) for (run, tags) in read_result.items()}
        # return http_util.Respond(request, run_info, "application/json")

        # data = read_result.get(run, {}).get(tag, [])
        # print(data)
        # if not data:
        #     raise werkzeug.exceptions.BadRequest("Invalid run or tag")
        # event_data = [datum.numpy.item().decode("utf-8") for datum in data]

        # contents = json.dumps(event_data, sort_keys=True)
        # print(contents)
        # return werkzeug.Response(contents, content_type="application/json")

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
