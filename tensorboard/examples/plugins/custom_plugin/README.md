# Custom plugin

## Overview

In this custom plugin, I define a two type of visualization which are represented using LineChart which uses [`D3.js`](https://d3js.org/getting-started) and [`ApexCharts.js`](https://apexcharts.com/docs/installation/#) libraries for custom visulization.

## Types of Summary

1) calculate_states : single/multi LineChart that can be ploted representing `x-axis` as number of steps and `y-axis` as any value that you want to represent for example, Loss,Accuracy,Flop Count.

    This summary is dynamic and not limited to the loss Accuracy and Flop calculation but rather it is able to visulize as many summary data user want to write as long as it is within the format.

2) system_performance : This is multi LineChart plot with annotations on the x-axis indicatiind `timestamp` and different `phases` of the data on that timeline and `y-axis ` shows `context` values such as Energy/Temprature.

    As multi-line Chart it will show different system resources mentioned by the user such as `GPU`, `RAM`, `CPU` power/energy consumption. This Feature is also  also dynamic, it can show multiple graph and multiple lines depending upon the context and number of resouces mentioned.

Note: when you write summary for visualization there will be two differnt format for writting the summary. Choose appropriate based on your usecase.

## Guide : How to install, generate logs and visualize 

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

Copy the directory `tensorboard/examples/plugins/custom_plugin` into a desired folder. In a virtualenv with TensorBoard installed, run:

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

locate this directory `tensorboard/examples/plugins/custom_plugin/main_plugin/demo` you will find several mentiond `.py` files which can generate different summaries.

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

<div style="display: flex; justify-content: space-between;">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-2.png" alt="Home" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-3.png" alt="loss" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-4.png" alt="train_test" wi_dth="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-5.png" alt="Home" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-6.png" alt="Home" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/fake_bert-7.png" alt="Home" width="300" height="200">

</div>



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

<div style="display: flex; justify-content: space-between;">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-1.png" alt="System Performance 1" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-2.png" alt="System Performance 2" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-3.png" alt="System Performance 3" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-4.png" alt="System Performance 4" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-5.png" alt="System Performance 5" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-5-5.png" alt="System Performance 5" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-6.png" alt="System Performance 6" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-7.png" alt="System Performance 7" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-8.png" alt="System Performance 8" width="300" height="200">

<img src="https://github.com/Darshil580/tensorboard/blob/test/tensorboard/examples/plugins/custom_plugin/images/system_performance-9.png" alt="System Performance 9" width="300" height="200">

</div>


# How to write the summary for this plugin

## Directory Structure of generated logs

Usually one plugin is used for single type of visualization but this plugin contains two different type of visaulization. Therefore the summary needs to be mentioned in a specific folder

```
├── Folder_Name
│   ├── calculate_states
│   │   ├── tf.event file (Summary Type - 1)
│   ├── system_performance
│   │   ├── tf.event file (Summary Type - 2)
```

## How to create  log file for this plugin

### 1. calculate_states (Type - 1 Summary):

When writting a summary in order seperate the details for plugin type-1 summary. Create a `SummaryWriter` to log information for TensorBoard in the specified directory.

```
from torch.utils.tensorboard import SummaryWriter
writer = SummaryWriter('logs/calculate_states')
```
Once you initiate `SummaryWriter()` you can use that instatce to flush out summary information to tensorflow event file.  

```
writer.add_scalar('Tag1/train', value, step)
writer.add_scalar('Tag1/test', value, step)
  
writer.add_scalar('Tag2/train', value, step)
writer.add_scalar('Tag2/test', value, step)

writer.add_scalar('Tag3/Conv2D', value, step)
writer.add_scalar('Tag3/Flatten', value, step)
writer.add_scalar('Tag3/Dense', value, step)
```

Above calculate_states will have basically 3 multiline chart sequencially based on the summary mentioned in above code.
`Tag1`, `Tag2`, `Tag3` will create multilinechart between the same `tag` name and additionally also create seperate line plot.

`value` can be int,float that you want to plot on the chart and `step` represent data point number as Linear scale. 

Note If you mention the same step number for same `tag/graph` then it's going to overwrite the previous value.

```
writer.close() # To end the Summary
```

### 2. system_performance (Type - 2 Summary):

The system_performance summary is used to visualize performance metrics of a system, such as CPU, GPU, and RAM usage, over time. Pleas check `tensorboard/examples/plugins/custom_plugin/main_plugin/demo/large_sample.json` containing energy and time data for different layers and also time vs temprature for GPU.

This summary is complex as compare to previous one because there are specific `flags` that need to be mentioned depending upon the data. For example, data containing `start_execution_time` infotmation to decide the ploting sequence. Another is `timeOffset` which is optional.


lets begin how to write summary

```
import tensorflow as tf

log_path = "logs/system_performance"
writer = tf.summary.create_file_writer(log_path)
```

Once you get `writer` variable from `tf.summary.create_file_writer()` you can use that instatce to flush out summary information to tensorflow event file. Remember that there are multiple layers so this entire code will run iteratively for each `layers/API calls`.  

```
tf.summary.scalar("LayerName/resource", value, step=timestamp)
```
for example,

```
tf.summary.scalar("tensorflow.data.from_tensor_slices()/CPU", 12, step=1782110112050000000)
tf.summary.scalar("tensorflow.data.from_tensor_slices()/GPU", 15, step=1782110112050000000)
tf.summary.scalar("tensorflow.data.from_tensor_slices()/RAM", 10, step=1782110112050000000)
```

Above example `tf.summary.scalar()` method has argument called step which takes `timestamp` and it is  mentioned as `19` digit number. `step` argument can only take data in `int` format without floating point. 

So, convert timestamp like `1782110112.052030000` to `1782110112052030000` by multiplying `10000...(Number of digit after floating point)`.

```
tf.summary.scalar("tensorflow.data.from_tensor_slices()/RAM", 10, step=1782110112.050000000 * 1000000000)
```
Now lets see  this with multiple layer.

```
lst = [
    "layer1",
    "layer2",
    "layer3"
    ]
    
layer_start_time = [
                    1782110112052030000, 
                    1782110113052030000, 
                    1782110114052030000
                    ]
i = 0

for layer in lst:

    # Start time is important to mentioned because plugin is going to use the start_time to decide the sequence of the data ploting of each API call/layer.

    tf.summary.scalar(f"{layer}/start_execution_time",0,step=layer_start_time[i])
    i += 1

    for itr in range(100):

        tf.summary.scalar(f"{layer}/RAM", 10 * itr, step=int(1782110112.050000000 * 1000000000))
        tf.summary.scalar(f"{layer}/GPU", 20 * itr, step=int(1782110112.050000000 * 1000000000))
        tf.summary.scalar(f"{layer}/CPU", 30 * itr, step=int(1782110112.050000000 * 1000000000))
    
    writer.flush() #depends when you want to flush information to tf event file.

```

This was very simplified form of summary. But to make it more dynamic, Please refer to the example mentioned in the file located at `tensorboard/examples/plugins/custom_plugin/main_plugin/demo/` and a file is `transform.py` which reads data from json file and write summary of mentioned data.

Note: `start_time_execution` should be mentioned as third argument which specify the `step` number. because `tf.summary.scalar summary()`'s  `value` argument does not support `19` digit int number.

Additonally, Plugin also look into the context of the resource passed. For example, `CPU`, `GPU`, `RAM`, `GPU-temprature`, `CPU-temprature`.

```
...
    ...
    ...
    tf.summary.scalar(f"{layer}/RAM", 10 * itr, step=int(1782110112.050000000 * 1000000000))
    tf.summary.scalar(f"{layer}/GPU", 20 * itr, step=int(1782110112.050000000 * 1000000000))
    tf.summary.scalar(f"{layer}/CPU", 30 * itr, step=int(1782110112.050000000 * 1000000000))

    tf.summary.scalar(f"{layer}/GPU-temprature", 30 * itr, step=int(1782110112.050000000 * 1000000000))
    tf.summary.scalar(f"{layer}/CPU-temprature", 30 * itr, step=int(1782110112.050000000 * 1000000000))
    
    ...
    ...
...
...
    
```

Plugin will automatically sperate the graph and name them based on context. For example, above default plot is `Energy` and another will be `temprature`.

So total there will be `2` graph with multiple `line plots`.
1. `Energy (y-axis) vs Timestamp (x-axis)` - `CPU`, `GPU`, `RAM` data as line chart
2. `temprature (y-axis) vs Timestamp (x-axis)` - `CPU`, `GPU` data as line chart

if there was one more context then the plugin would create 3 three graphs so on and so forth.

## Additional Feature

1. Convert graphs to SVG PNG and CSV.
2. Zoom In - Zoom out Clipping: 
    When you zoom In and press annotation button it will set that particular zoom clip as default reset zoom. So when you click on reset zoom button, it will not zoom out instead you have to use zoom out maginfier.
3. Color Picker for a line.
4. Annotation on the graph for Type-2 Summary 
    This is controllable by button for individual resources. - Double Click on the button to activate particular annotation. 
5. Standard deviation plot.


## Development Guid

Built using Python as backend and Native JavaScript as frontend, no Bazel is used for the development.

Frontend : 

1. index.js - Dynamoically add the HTML element to the browser.
2. style.css - Styling HTML components.
3. model.js - data binding with entity and backend server requests.
4. views.js - Contains  list of Custom HTML Fragments added dynamically to browser.
5. apexchart.js - ApexChart is javascript library for creating vizualization with customization.
6. d3.v7.min.js - D3.js is also javascript library which provides highly customizatized graph and it is very powerfull. Graph generation is done throgh SVG.
7. logo - This folder contains some images for svg download and color picker button.

Backend :

1. metadata.py - Usually contains small information about plugin.
2. summary_v2.py - This file usually developed for custom summary writting without using any in-build methods provided by tensorboard for writting summary
3. plugin.py - Main logic of the plugin such as how to read and parse data to send it to designated frontend API calls.
4. setup.py - This file is an entry point to install the plugin into your current environment.
5. test.py - This file contains all the unittestcases for the plugin.py file


