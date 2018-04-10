"""Common utils for all inference plugin files."""


class InvalidUserInputError(Exception):
  """An exception to throw if user input is detected to be invalid.

  Attributes:
    original_exception: The triggering `Exception` object to be wrapped, or
      a string.
  """

  def __init__(self, original_exception):
    """Inits InvalidUserInputError."""
    self.original_exception = original_exception
    Exception.__init__(self)

  @property
  def message(self):
    return 'InvalidUserInputError: ' + str(self.original_exception)
