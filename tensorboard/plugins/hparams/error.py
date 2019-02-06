"""Defines an error (exception) class for the HParams plugin."""


class HParamsError(Exception):
  """Represents an error that is meaningful to the end-user. Such an error
  should have a meaningful error message. Other errors, (such as resulting
  from some internal invariants being violated) should be represented by
  other exceptions.
  """
  pass
