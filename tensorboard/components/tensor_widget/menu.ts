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
type EventCallback = (event: Event) => void | Promise<void>;

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


interface FlatMenuItemConfig {
  caption: string,
  onClick: EventCallback | null;
  onHover: EventCallback | null;
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
    this.dropdown.addEventListener('mouseleave', () => {
      this.hide();
    });
    parentElement.appendChild(this.dropdown);
  }

  show(
    top: number,
    left: number,
    captions: string[],
    onClickCallbacks: Array<EventCallback | null>,
    onHoverCallbacks: Array<EventCallback | null>
  ) {
    captions.forEach((caption, i) => {
      const menuItem = document.createElement('div');
      menuItem.classList.add('tensor-widget-dim-dropdown-menu-item');
      menuItem.textContent = caption;
      this.dropdown.appendChild(menuItem);
      const onClick = onClickCallbacks[i];
      const onHover = onHoverCallbacks[i];
      menuItem.addEventListener('click', (event) => {
        if (onClick !== null) {
          onClick(event);
        }
        this.hide();
      });
      menuItem.addEventListener('mouseenter', (event) => {
        if (onHover !== null) {
          onHover(event);
        }
        menuItem.classList.add('tensor-widget-dim-dropdown-menu-item-active');
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.classList.remove(
          'tensor-widget-dim-dropdown-menu-item-active'
        );
        if (onHover === null) {
          return;
        }
        const childrenToRemove: Element[] = [];
        for (let i = 0; i < menuItem.children.length; ++i) {
          const child = menuItem.children[i];
          if (child.classList.contains('tensor-widget-dim-dropdown')) {
            childrenToRemove.push(child);
          }
        }
        childrenToRemove.forEach((child) => menuItem.removeChild(child));
      });
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

  // The currently selected indices for all multiple-choice menu items.
  private currentChoiceSelections: {[itemIndex: number]: number};

  /**
   * Constructor for the Menu class.
   *
   * @param config Configuration for the menu.
   */
  constructor(
    private readonly config: MenuConfig,
    private readonly parentElement: HTMLDivElement
  ) {
    this.baseFlatMenu = new FlatMenu(this.parentElement);

    this.currentChoiceSelections = {};
    this.config.items.forEach((item, i) => {
      if ((item as ChoiceMenuItemConfig).options != null) {
        this.currentChoiceSelections[
          i
        ] = (item as ChoiceMenuItemConfig).defaultSelection;
      }
    });
  }

  /**
   * Show the menu.
   *
   * @param top The top coordinate for the top-left corner of the menu.
   * @param left The left coordinate for the top-left corner of the menu.
   */
  show(top: number, left: number) {
    const captions: string[] = this.config.items.map((item) => item.caption);
    const clickCallbacks: Array<EventCallback | null> = this.config.items.map(
      (item, i) => {
        if ((item as ChoiceMenuItemConfig).options != null) {
          // This is a multiple-choice item.
          return null;
        } else if ((item as ToggleMenuItemConfig).defaultState != null) {
          // This is a binary toggle item.
          // TODO(cais): Modify state.
          return null;
        } else {
          // This is a single-command item.
          return (item as SingleActionMenuItemConfig).callback;
        }
      }
    );
    const hoverCallbacks: Array<EventCallback | null> = this.config.items.map(
      (item, i) => {
        if ((item as ChoiceMenuItemConfig).options != null) {
          // TODO(cais): Check to make sure it's not empty?
          const currentSelectionIndex = this.currentChoiceSelections[i];
          return (event) => {
            const parent = event.target as HTMLDivElement;
            const choiceConfig = item as ChoiceMenuItemConfig;
            const captions = choiceConfig.options.map((option, k) => {
              return k === currentSelectionIndex ? option + ' (✓)' : option;
            });
            const optionsFlatMenu = new FlatMenu(parent);
            const onClicks: Array<EventCallback | null> = choiceConfig.options.map(
              (option, k) => {
                return () => {
                  if (currentSelectionIndex !== k) {
                    this.currentChoiceSelections[i] = k;
                    choiceConfig.callback(k);
                  }
                };
              }
            );
            const onHovers = captions.map(() => null);
            const box = parent.getBoundingClientRect();
            const top = box.top;
            const left = box.right;
            optionsFlatMenu.show(top, left, captions, onClicks, onHovers);
          };
        } else {
          return null;
        }
      }
    );
    this.baseFlatMenu.show(top, left, captions, clickCallbacks, hoverCallbacks);
  }

  /** Hide the menu. */
  hide() {
    this.baseFlatMenu.hide();
  }

  shown(): boolean {
    return this.baseFlatMenu.shown();
  }
}
