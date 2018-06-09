/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

namespace memory_viewer {

Polymer({
  is:'tf-mv-bar',
  properties:{
    value:{
      type:Number,
      notify:true,
      observer:'_updateValue',
    },
  }, 
  /**
   * Updates the utilization bar.
   */
  _updateValue:function(value: number) {
    const color = memory_viewer.flameColor(value);
    const length = memory_viewer.percent(value);
    this.style.background =
        `linear-gradient(to right, ${color} ${length}, #ccc ${length})`;
  }
});

Polymer({
  is:'buffer-details',
  properties:{
    node:{
      type:Object,
      notify:true,
      observer:'_updateCard'
    },
    size:{
      type:String,
      notify:true,
    },
    unpaddedSize:{
      type:String,
      notify:true,
    },
    padding:{
      type:String,
      notify:true,
    },
    expansion:{
      type:String,
      notify:true,
    },
    utilization:{
      type:Number,
      notify:true,
    },
  },
  /**
   * Updates the details card.
   */
  _updateCard:function(node) {
    if (node == null) {
      return;
    }
    this.size = node.data[0][0].toFixed(1);
    let color = 'rgb(192,192,192)';
    if (node.unpaddedSizeMiB) {
      this.unpaddedSize = node.unpaddedSizeMiB.toFixed(1);
      this.padding = (node.data[0][0] - node.unpaddedSizeMiB).toFixed(1);
      this.utilization = node.unpaddedSizeMiB / node.data[0][0];
      this.expansion = (1 / this.utilization).toFixed(1);
      color = memory_viewer.flameColor(this.utilization, 0.7);
    }
    this.$.card.updateStyles({'--paper-card-header':'background-color:' + color});
    this.$.subheader.style.backgroundColor = color;
  },
  /**
   * Returns the sub header of the buffer details card.
   */
  _subheader:function(node): string {
    if (!node) {
      return null;
    }
    if (node.opcode) {
      return node.opcode + ' operation';
    }
    return '';
  },
});

} // namespace memory_viewer
