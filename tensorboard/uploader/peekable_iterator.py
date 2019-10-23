"""Iterator adapter that supports peeking ahead."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


class PeekableIterator(object):
  """Iterator adapter that supports peeking ahead.

  As with most Python iterators, this is also iterable; its `__iter__`
  returns itself.

  This class is not thread-safe. Use external synchronization if
  iterating concurrently.
  """

  def __init__(self, iterable):
    """Initializes a peeking iterator wrapping the provided iterable.

    Args:
      iterable: An iterable to wrap.
    """
    self._iterator = iter(iterable)
    self._has_peeked = False
    self._peeked_element = None

  def has_next(self):
    """Checks whether there are any more items in this iterator.

    The next call to `next` or `peek` will raise `StopIteration` if and
    only if this method returns `False`.

    Returns:
      `True` if there are any more items in this iterator, else `False`.
    """
    try:
      self.peek()
      return True
    except StopIteration:
      return False

  def peek(self):
    """Gets the next item in the iterator without consuming it.

    Multiple consecutive calls will return the same element.

    Returns:
      The value that would be returned by `next`.

    Raises:
      StopIteration: If there are no more items in the iterator.
    """
    if not self._has_peeked:
      self._peeked_element = next(self._iterator)
      self._has_peeked = True
    return self._peeked_element

  def __iter__(self):
    return self

  def __next__(self):
    if self._has_peeked:
      self._has_peeked = False
      result = self._peeked_element
      self._peeked_element = None  # allow GC
      return result
    else:
      return next(self._iterator)

  def next(self):
    # (Like `__next__`, but Python 2.)
    return self.__next__()
