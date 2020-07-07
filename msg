Considered having a lock for the cache itself and a separate family of
“invocation locks” keyed by provider key, to allow for more fine-grained
concurrency while still ensuring that each provider’s `authenticate` is
only invoked once. But because you perform an open call while holding an
invocation lock there’s no way to enforce a total lock order, so this
would be a subtle opportunity for deadlock.
