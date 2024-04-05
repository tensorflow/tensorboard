# Custom plugin

## Overview

In this custom plugin, I define a two type of visualization which are represented using LineChart which uses [`D3.js`](https://d3js.org/getting-started) and [`ApexCharts.js`](https://apexcharts.com/docs/installation/#) libraries for custom visulization.

## Types of Summary

1) calculate_states : single/multi LineChart that can be ploted representing `x-axis` as number of steps and `y-axis` as any value that you want to represent for example, Loss,Accuracy,Flop Count.

    This summary is dynamic and not limited to the loss Accuracy and Flop calculation but rather it is able to visulize as many summary data user want to write as long as it is within the format.

2) system_performance : This is multi LineChart plot with annotations on the x-axis indicatiind `timestamp` and different `phases` of the data on that timeline and `y-axis ` shows `context` values such as Energy/Temprature.

    As multi-line Chart it will show different system resources mentioned by the user such as `GPU`, `RAM`, `CPU` power/energy consumption. This Feature is also  also dynamic, it can show multiple graph and multiple lines depending upon the context and number of resouces mentioned.

Note: when you write summary for visualization there will be two differnt format for writting the summary. Choose appropriate based on your usecase.

## Guide : How to install, generate logs and visulize 

## 1. Setup Virtualenv (Recommanded - Development mode)

```sh
$ virtualenv -p python3 tf
$ source tf/bin/activate
(tf)$ pip install --upgrade pip
```
if you don't have tensorboard install then git clone the repositiory from [Tensorboard](https://github.com/Darshil580/tensorboard) then go tensorboard directory in an active virtualenv and follow the below steps.

```
(tf)$ pip install tf-nightly tf-keras-nightly -r tensorboard/pip_package/requirements.txt -r tensorboard/pip_package/requirements_dev.txt
```

### OR

## How to install the plugin

Copy the directory `tensorboard/plugins/custom_plugin` into a desired folder. In a virtualenv with TensorBoard installed, run:

```
python setup.py develop
```

This will link the plugin into your virtualenv. Then, just run below command but remember if you have not generated summary then plugin will not show any type of visualization unless it is detected by other plugin for visulization.

```
tensorboard --logdir directory/logs
```
or

```
tensorboard --logdir=logs
```

## Example : Generating the summary using demo files given.

locate this directory `tensorboard/plugins/custom_plugin/main_plugin/demo` you will find several mentiond `.py` files which can generate different summaries.

Remember the entrie plugin has two spetate summary supported.

### Demo 1: Calculate_states

If you are not located in the above mentiond `demo` directory then go to the directory. you will be able to see `fake_bert.py` file.

`fake_bert.py` demo file contains a Python Module `torch`. You may need to install that for running the script or you can use `Google Colab` to run the script and then download the logs to your local system.

```
pip install torch
```
then run this file if you are located in the above mentiond `demo` directory.
```
python fake_bert.py
```
This will create logs dirctory with that there will be a folder called `calculate_states`. This name is important for plugin to recognize which type of summary is this. so when you write your own summary you have to follow the directory name `logs/calculate_states` for `Type-1` vizualization.

now run below command

```
tensorboard --logdir=logs --samples_per_plugin=scalars=3000
```
this command will run the tensorboard server on port [localhost](http://localhost:6006). But additionally, flag
`--samples_per_plugin=scalars=3000` which indicates take upto 3000 Scalar data points. If you don't mentioned that then tensorboard will max only take 1000 scalar balue per tag. You can write any number depeding upon your requirements.


Here are some attached Screenshots.

![home](https://drive.google.com/file/d/1jpf7EFN9goIaez3713pBZBU1S5rGSkFo/view?usp=drive_link)


### Demo 2: system_performance


In the `demo` folder you will find `transform.py` which writes summary `tf.summary.scalar(tag,value,step)` using in-built scalar method. There is a `large_sample.json` file which `transform.py` converting into tensorboard summary.

`large_sample.json` file contains set of API calls which contains set of resources like `GPU`, `RAM`, `CPU` and their energy consumption and GPU's temporature value. Each layer shows datavalues for particular period of time.

Now, Run this command to execute the script.
```
python transform.py
```
This will generate `system_performance` directory inside logs folder which tensorboard will be able read when below command is executed. Once again, when you write your own summary you have to follow the directory name `logs/system_performance` for `Type-2`vizualization.

```
tensorboard --logdir=logs --samples_per_plugin=scalars=3000
```

this command will run the tensorboard server on port [localhost](http://localhost:6006). But additionally, flag
`--samples_per_plugin=scalars=3000` which indicates take upto 3000 Scalar data points. If you don't mentioned that then tensorboard will max only take 1000 scalar value per tag. You can write any number depeding upon your requirements.

Here are some attached Screenshots.

![home](https://drive.google.com/file/d/1jpf7EFN9goIaez3713pBZBU1S5rGSkFo/view?usp=drive_link)









## How to modify

Built using Python as backend and Native JavaScript as frontend, no Bazel is used for the development.

1. index.js - Dynamoically add the HTML element to the browser.
2. style.css - Styling HTML components.
3. model.js - data binding with entity and backend server requests.
4. views.js - Contains  list of Custom HTML Fragments added dynamically to browser.

## Running the example

Generate some sample Greeting summaries by running [`transform.py`][demo_py] and torch. Alternatively, to write Greetings from your own Python program, import [`summary_v2.py`][summary_v2_py], create a summary file writer, and call `summary_v2.greeting("very important people", "you", step)`.

[demo_py]: tensorboard_plugin_example/demo.py
[summary_v2_py]: tensorboard_plugin_example/summary_v2.py

