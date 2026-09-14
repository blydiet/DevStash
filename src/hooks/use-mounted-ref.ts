import { useEffect, useRef } from "react";

// Guards against a stale in-flight async response landing after the calling
// component unmounts — e.g. ItemDrawerProvider.openItem() switching to a
// different item's id while the drawer stays open, remounting the caller via
// key={item.id} mid-request.
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
