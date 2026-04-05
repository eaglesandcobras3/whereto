"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "onError"> & {
  /** Fallback gradient to show if image fails to load */
  fallbackGradient?: string;
  /** Optional fallback src */
  fallbackSrc?: string;
};

function generateGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 360;
  const gradients = [
    "linear-gradient(135deg, #a5f3fc 0%, #99f6e4 50%, #6ee7b7 100%)",
    "linear-gradient(135deg, #fde68a 0%, #fdba74 50%, #fca5a1 100%)",
    "linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 50%, #fda4af 100%)",
    "linear-gradient(135deg, #bef264 0%, #86efac 50%, #6ee7b7 100%)",
    "linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #f59e0b 100%)",
    "linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #7c3aed 100%)",
  ];
  return gradients[h % gradients.length];
}

export function ImageWithFallback({
  src,
  alt,
  fallbackGradient,
  fallbackSrc,
  className = "",
  style,
  ...props
}: Props) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const gradient =
    fallbackGradient ?? generateGradient(typeof src === "string" ? src : alt);

  // Show gradient fallback if no src, error occurred, or using fallback
  if (!src || (error && !fallbackSrc)) {
    return (
      <div
        className={`${className}`}
        style={{
          ...style,
          background: gradient,
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  // Show fallback image if error occurred and fallbackSrc is provided
  if (error && fallbackSrc) {
    return (
      <Image
        {...props}
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Loading shimmer */}
      {loading && (
        <div
          className="absolute inset-0 skeleton"
          style={{ background: gradient }}
        />
      )}

      <Image
        {...props}
        src={src}
        alt={alt}
        className={`${className} ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
