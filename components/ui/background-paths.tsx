"use client";

import { motion } from "framer-motion";

function FloatingPaths({ position, isDark }: { position: number; isDark: boolean }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  // Brighter opacity for light mode, subtler for dark mode
  const baseOpacity = isDark ? 0.08 : 0.15;
  const opacityIncrement = isDark ? 0.015 : 0.025;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={isDark ? "url(#tealGradientDark)" : "url(#tealGradientLight)"}
            strokeWidth={path.width}
            strokeOpacity={baseOpacity + path.id * opacityIncrement}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.4, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
        <defs>
          {/* Dark mode gradient - subtle teal/cyan/violet */}
          <linearGradient id="tealGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          {/* Light mode gradient - brighter, more visible */}
          <linearGradient id="tealGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function BackgroundPaths({ 
  children,
  isDark = true 
}: { 
  children?: React.ReactNode;
  isDark?: boolean;
}) {
  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden transition-colors duration-300"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0">
        <FloatingPaths position={1} isDark={isDark} />
        <FloatingPaths position={-1} isDark={isDark} />
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
