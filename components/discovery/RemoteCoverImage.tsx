"use client";

import Image from "next/image";
import { useState } from "react";

function isRemote(url: string | null | undefined) {
  return !!url && (url.startsWith("https://") || url.startsWith("http://"));
}

type IconSize = "sm" | "md";

export type RemoteCoverImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  placeholderIcon: string;
  iconSize?: IconSize;
};

const iconSizeClass: Record<IconSize, string> = {
  sm: "text-lg",
  md: "text-4xl",
};

function RemoteCoverImageInner({
  src,
  alt,
  fill = true,
  className,
  sizes,
  placeholderIcon,
  iconSize = "md",
}: RemoteCoverImageProps) {
  const [broken, setBroken] = useState(false);
  const showImage = isRemote(src) && !broken;

  if (!showImage) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          className={`material-symbols-outlined text-[var(--color-text-tertiary)] ${iconSizeClass[iconSize]}`}
        >
          {placeholderIcon}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

export function RemoteCoverImage(props: RemoteCoverImageProps) {
  return <RemoteCoverImageInner key={props.src ?? "none"} {...props} />;
}
