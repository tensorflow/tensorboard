try:
    from tensorboard.tf_disabled import use_tf
except ImportError:
    from tensorboard.tf_enabled import use_tf
