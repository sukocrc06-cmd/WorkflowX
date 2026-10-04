'use client';
import * as React from 'react';
/** true on macOS / iOS (for ⌘ vs Ctrl labels). Server render assumes "not Mac". */
export function useIsMac() {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) }, []);
  return mac;
}
