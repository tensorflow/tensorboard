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

type Callback = () => void | Promise<void>;
type HoverCallback = (event: Event) => void | Promise<void>;

/**
 * The base interface for a menu item.
 */
export interface MenuItemConfig {
  /** Caption displayed on the menu item. */
  caption: string;
}

/**
 * A menu item which when clicked, triggers a single action.
 */
export interface SingleActionMenuItemConfig extends MenuItemConfig {
  /** The callback that gets called when the menu item is clicked. */
  callback: Callback;
}

export interface ChoiceMenuItemConfig extends MenuItemConfig {
  /** All possible options. */
  options: string[];

  /** The default selection from `options`, a 0-based index. */
  defaultSelection: number;

  /**
   * The callback that gets called when the selection has changed.
   *
   * The `currentSelection` argument is the 0-based index for the currently
   * selected option.
   */
  callback: (currentSelection: number) => void | Promise<void>;
}

/**
 * A menu item that supports a binary toggle state.
 */
export interface ToggleMenuItemConfig extends MenuItemConfig {
  /** The default state of the menu item. */
  defaultState: boolean;

  /**
   * The callback that gets called when the toggle state has changed.
   *
   * The `currentState` argument is a boolean indicating whether the
   * toggle menu item is activated (`true`) or not (`false`).
   */
  callback: (currentState: boolean) => void | Promise<void>;
}

export interface MenuConfig {
  /** An ordered list of items that comprise the menu. */
  items: MenuItemConfig[];
}

/**
 * Helper class: A menu item without hierarchy.
 */
class FlatMenu {
  private isShown: boolean = false;
  private dropdown: HTMLDivElement;
  // TODO(cais): Tie in the arg lengths.
  constructor(parentElement: HTMLDivElement) {
    this.dropdown = document.createElement('div');
    this.dropdown.classList.add('tensor-widget-dim-dropdown');
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.display = 'none';
    parentElement.appendChild(this.dropdown);
  }

  show(
    top: number,
    left: number,
    captions: string[],
    onHoverCallbacks: Array<HoverCallback | null>
  ) {
    captions.forEach((caption, i) => {
      const menuItem = document.createElement('div');
      menuItem.classList.add('tensor-widget-dim-dropdown-menu-item');
      menuItem.textContent = caption;
      this.dropdown.appendChild(menuItem);
      const onHover = onHoverCallbacks[i];
      if (onHover !== null) {
        menuItem.addEventListener('mouseover', onHover);
        // TODO(cais): Add mouseexit callback.
      }
    });
    this.dropdown.style.display = 'block';
    this.dropdown.style.top = top + 'px';
    this.dropdown.style.left = left + 'px';
    const actualRect = this.dropdown.getBoundingClientRect();
    const topOffset = actualRect.top - top;
    const leftOffset = actualRect.left - left;
    this.dropdown.style.top = (top - topOffset).toFixed(1) + 'px';
    this.dropdown.style.left = (left - leftOffset).toFixed(1) + 'px';
    this.isShown = true;
  }

  hide() {
    this.dropdown.style.display = 'none';
    while (this.dropdown.firstChild) {
      this.dropdown.removeChild(this.dropdown.firstChild);
    }
    this.isShown = false;
  }

  shown() {
    return this.isShown;
  }
}

/**
 * A class for menu that supports configurable items and callbacks.
 */
export class Menu {
  private baseFlatMenu: FlatMenu;

  /**
   * Constructor for the Menu class.
   *
   * @param config Configuration for the menu.
   */
  constructor(
    private readonly config: MenuConfig,
    private readonly parentElement: HTMLDivElement
  ) {
    this.baseFlatMenu = new FlatMenu(parentElement);
  }

  /**
   * Show the menu.
   *
   * @param top The top coordinate for the top-left corner of the menu.
   * @param left The left coordinate for the top-left corner of the menu.
   */
  show(top: number, left: number) {
    const captions: string[] = this.config.items.map((item) => item.caption);
    const onHovers: Array<HoverCallback | null> = this.config.items.map(
      (item) => {
        if ((item as ChoiceMenuItemConfig).options != null) {
          // TODO(cais): Check to make sure it's not empty?
          return (event) => {
            const captions = (item as ChoiceMenuItemConfig).options;
            const optionsFlatMenu = new FlatMenu(this.parentElement);
            console.log(captions);
            console.log(event.srcElement);
            const box = (event.srcElement as HTMLDivElement).getBoundingClientRect();
            const top = box.top;
            const left = box.right;
            const onHovers = captions.map((caption) => null);
            optionsFlatMenu.show(top, left, captions, onHovers);
          };
        } else {
          return null;
        }
      }
    );
    this.baseFlatMenu.show(top, left, captions, onHovers);
  }

  /** Hide the menu. */
  hide() {
    this.baseFlatMenu.hide();
  }

  shown(): boolean {
    return this.baseFlatMenu.shown();
  }
}
