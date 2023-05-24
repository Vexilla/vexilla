import localforage from "localforage";
import { atom } from "jotai";

// type StorageValue = string | number | any[] | Object;

export function atomWithStorage<T>(key: string, initialValue: T) {
  const baseAtom = atom(initialValue);
  baseAtom.onMount = (setValue) => {
    (async () => {
      const item = (await localforage.getItem(key)) as string;
      if (item) {
        setValue(JSON.parse(item));
      }
    })();
  };
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update) => {
      const nextValue =
        typeof update === "function" ? update(get(baseAtom)) : update;
      set(baseAtom, nextValue);
      localforage.setItem(key, JSON.stringify(nextValue));
    }
  );
  return derivedAtom;
}
