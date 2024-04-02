python setup.py develop
set TF_ENABLE_ONEDNN_OPTS=0
tensorboard --logdir=main_plugin/logs/ --samples_per_plugin=scalars=3000
