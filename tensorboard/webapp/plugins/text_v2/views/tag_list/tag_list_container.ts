/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Component} from '@angular/core';

@Component({
  selector: 'tag-list-container',
  template: `
    <tag-list
      [tagGroupNameArray]="[tagGroupName1, tagGroupName2, tagGroupName3]"
      [tagNameArrayArray]="[tagNameArray1, tagNameArray2, tagNameArray3]"
      [runNameArrayArray]="[runNameArray1, runNameArray2, runNameArray3]"
      [colorArrayArray]="[colorArray1, colorArray2, colorArray3]"
    ></tag-list>
  `,
})
export class TagListContainer {
  tagGroupName1: string = 'group1';
  tagNameArray1: string[] = [
    'group1/tag1',
    'group1/tag1',
    'group1/tag2',
    'group1/tag2',
  ];
  runNameArray1: string[] = ['run1', 'run2', 'run1', 'run2'];
  colorArray1: string[] = ['orange', 'lightblue', 'orange', 'lightblue'];

  tagGroupName2: string = 'group2';
  tagNameArray2: string[] = [
    'group2/tag1',
    'group2/tag1',
    'group2/tag2',
    'group2/tag2',
  ];
  runNameArray2: string[] = ['run1', 'run2', 'run1', 'run2'];
  colorArray2: string[] = ['orange', 'lightblue', 'orange', 'lightblue'];

  tagGroupName3: string = 'group3';
  tagNameArray3: string[] = [
    'group3/tag1',
    'group3/tag1',
    'group3/tag2',
    'group3/tag2',
  ];
  runNameArray3: string[] = ['run1', 'run2', 'run1', 'run2'];
  colorArray3: string[] = ['orange', 'lightblue', 'orange', 'lightblue'];
}
