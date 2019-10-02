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

export interface MenuItemConfig {
  /** Caption displayed on the menu item. */
  caption: string;

  /** Click callback for the menu item. */
  onClick: () => void | Promise<void>;
}

export interface MenuConfig {
  /** An ordered list of items that comprise the menu. */
  items: MenuItemConfig[];
}

/**
 * A class for menu that supports configurable items and callbacks.
 */
export class Menu {
  /**
   * Constructor for the Menu class.
   *
   * @param config Configuration for the menu.
   */
  constructor(private readonly config: MenuConfig) {
  }

  /**
   * Show the menu.
   *
   * @param top The top coordinate for the top-left corner of the menu.
   * @param left The left coordinate for the top-left corner of the menu.
   */
  show(top: number, left: number) {

  }

  /** Hide the menu. */
  hide() {

  }
}