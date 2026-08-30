import { useState, useEffect } from "react";
import { DoxaLogo } from "./DoxaLogo";

export const SplashScreen = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000); // 2 seconds animation
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-fade-out">
      <div className="animate-pulse-scale">
        <DoxaLogo className="w-64 h-auto" />
      </div>
    </div>
  );
};
