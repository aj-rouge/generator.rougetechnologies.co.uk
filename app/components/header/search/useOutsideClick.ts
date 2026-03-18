import { useEffect, RefObject } from "react";

export const useOutsideClick = (
  ref: RefObject<HTMLElement>,
  buttonRef: RefObject<HTMLElement>,
  handler: () => void,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (
        !ref.current ||
        ref.current.contains(event.target as Node) ||
        !buttonRef.current ||
        buttonRef.current.contains(event.target as Node)
      ) {
        return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, buttonRef, handler]);
};
