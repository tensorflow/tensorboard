/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {Component, Input} from '@angular/core';

@Component({
  selector: 'tag',
  templateUrl: './tag.ng.html',
  styleUrls: ['./tag.css'],
})
export class TagComponent {
  @Input()
  tagName: string = '';

  @Input()
  tagColor: string = '';

  @Input()
  runName: string = '';

  stepList: Map<number, string[][]> = new Map();

  example1: string[][] = [
    [
      'We conducted an experiment and found the following data:\n\nPounds of chocolate | Happiness\n---|---\n0 | 1\n1 | 4\n2 | 9\n3 | 16\n4 | 25\n5 | 36\n6 | 49\n7 | 64\n8 | 81\n9 | 100\n10 | 121',
    ],
  ];

  example2: string[][] = [
    ['\u00d7', '**0**', '**1**', '**2**', '**3**', '**4**', '**5**'],
    ['**0**', '0', '0', '0', '0', '0', '0'],
    ['**1**', '0', '1', '2', '3', '4', '5'],
    ['**2**', '0', '2', '4', '6', '8', '10'],
    ['**3**', '0', '3', '6', '9', '12', '15'],
    ['**4**', '0', '4', '8', '12', '16', '20'],
    ['**5**', '0', '5', '10', '15', '20', '25'],
  ];

  example3: string[][] = [['**5**', '0', '5', '10', '15', '20', '25']];

  constructor() {
    this.stepList.set(0, this.example1);
    this.stepList.set(1, this.example2);
    this.stepList.set(2, this.example3);
  }
}
