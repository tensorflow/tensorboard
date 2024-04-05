import os
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


class System(base_plugin.TBPlugin):
    plugin_name = metadata.PLUGIN_NAME

    def __init__(self, context):
        self.data_provider = context.data_provider

    def get_plugin_apps(self):
        return {
            "/static/*": self._serve_static_file,
            "/tags": self._serve_tags,
            "/systerm": self._serve_system_states,
        }

    def is_active(self):

        if self.data_provider:
            return True
        return False

    def frontend_metadata(self):
        return base_plugin.FrontendMetadata(
            es_module_path="/static/index.js", tab_name="System_Performance"
        )

    #Retrieves information about tags associated with the plugin's data and returns it in JSON format.
    @wrappers.Request.application
    def _serve_tags(self, request):

        print("Serve tags is running.....")
    
        ctx = plugin_util.context(request.environ)
        experiment = plugin_util.experiment_id(request.environ)
        run_tag_mapping = self.data_provider.list_scalars(
            ctx,
            experiment_id=experiment,
            plugin_name=scalar_metadata.PLUGIN_NAME,
        )
        run_info = {run: list(tags) for (run, tags) in run_tag_mapping.items()}
        return http_util.Respond(request, run_info, "application/json")

    # For Providing the static files to tensorboard IFrame
    @wrappers.Request.application
    def _serve_static_file(self, request):
        static_path_part = request.path[len(_PLUGIN_DIRECTORY_PATH_PART) :]
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
    def _serve_system_states(self, request):
        run = request.args.get("run")
        tag = request.args.get("tag")
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

        scalars = read_result.get(run, {}).get(tag, None)
        if scalars is None:
            raise errors.NotFoundError(
                "No scalar data for run=%r, tag=%r" % (run, tag)
            )
        body = [(x.wall_time, x.step, x.value) for x in scalars]
        return http_util.Respond(request, body, "application/json")
