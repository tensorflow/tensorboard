import traceback

class Suggestion(Exception):
    def __init__(self, from_exception, stack_trace=None):
        Exception.__init__(self, str(from_exception))
        self.type = type(from_exception).__name__
        self.error = str(from_exception)
        self.suggestion = self._error_suggestion_map(self.error)
        if stack_trace is not None:
          self.stack_trace = stack_trace
        else:
          self.stack_trace = traceback.format_exc()

    @classmethod
    def _error_suggestion_map(cls, error):
        error_map = cls._get_error_map()
        for item in error_map:
            if error.find(item) >= 0:
                print(error_map[item])
                return error_map[item]
        return None

    @classmethod
    def _get_error_map(cls):
        return {}
