/**
 * Reference-counted body scroll lock so nested modals don't leave
 * overflow:hidden stuck after the last one closes.
 */
let lockCount = 0;

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
    }
  };
}

/** Clear any leftover inline overflow locks (safe on route enter). */
export function clearBodyScrollLocks() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
}
