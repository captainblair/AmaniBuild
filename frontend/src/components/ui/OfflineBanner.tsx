"use client";

import { useEffect, useState } from "react";

type Props = {
  className?: string;
};

export function OfflineBanner({ className = "" }: Props) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={`offline-banner ${className}`.trim()} role="status">
      You’re offline. Changes will sync when the connection returns.
    </div>
  );
}
