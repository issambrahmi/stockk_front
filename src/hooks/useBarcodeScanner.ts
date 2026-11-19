import { useEffect, useRef } from "react";
import { scannerBridge } from "@/lib/scannerBridge";

/**
 * Marks an input as a *special* barcode field: while focused, phone scans are
 * routed to `onScan` (e.g. POS auto-add + beep) instead of being injected as
 * plain text. Spread the returned props on the <input>. Arming happens globally
 * for any editable field, so plain fields also receive scans as typed text.
 */
export function useBarcodeScanner(onScan: (code: string) => void | Promise<void>) {
  const handlerRef = useRef(onScan);
  handlerRef.current = onScan;
  const wrappedRef = useRef<(code: string) => void>((code) => {
    void handlerRef.current(code);
  });

  useEffect(() => {
    scannerBridge.init();
  }, []);

  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) =>
      scannerBridge.register(e.currentTarget, wrappedRef.current),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) =>
      scannerBridge.unregister(e.currentTarget),
  };
}
