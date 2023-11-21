/**
 * IMPORTANT: This file should not have any imports because it serves as a
 * communication bridge between the Angular and Polymer binaries.
 */

interface SetStringOption {
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   */
  useLocationReplace?: boolean;
}

interface TfStorage {
  setString(key: string, value: string, options?: SetStringOption): void;
  getString(key: string): string;
  migrateLegacyURLScheme(): void;
  getUrlHashDict(): Record<string, string>;
}

interface TfGlobals {
  setUseHash(use: boolean): void;
}

type TfStorageProperty = Map<keyof TfStorage, TfStorage[keyof TfStorage]>;
type TfGlobalsProperty = Map<keyof TfGlobals, TfGlobals[keyof TfGlobals]>;

declare global {
  interface Window {
    tensorboard: {
      tf_storage: Partial<TfStorage>;
      tf_globals: Partial<TfGlobals>;
    };
  }
}

if (!window['tensorboard']) {
  window['tensorboard'] = {
    tf_globals: {},
    tf_storage: {},
  };
}

function getTb() {
  return window['tensorboard'];
}

export function getStorage<T extends keyof TfStorage>(
  key: T
): TfStorage[T] | undefined {
  return getTb()['tf_storage'][key] as TfStorage[T] | undefined;
}

export function addToStorage<K extends keyof TfStorage>(
  key: K,
  value: TfStorage[K]
) {
  getTb()['tf_storage'][key] = value;
}

export function getGlobals<T extends keyof TfGlobals>(
  key: T
): TfGlobals[T] | undefined {
  return getTb()['tf_globals'][key];
}

export function addToGlobals<K extends keyof TfGlobals>(
  key: K,
  value: TfGlobals[K]
) {
  getTb()['tf_globals'][key] = value;
}
