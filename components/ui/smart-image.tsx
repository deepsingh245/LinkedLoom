"use client";

import React, { useState, useEffect } from "react";
import { getImageVariants, ImageVariants } from "@/lib/firebase/storage";
import { cn } from "@/lib/utils";

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

// Simple in-memory cache for variant URLs
const variantCache: Record<string, ImageVariants> = {};

export function SmartImage({ src, alt, className, fallbackSrc, ...props }: SmartImageProps) {
  const [variants, setVariants] = useState<ImageVariants | null>(variantCache[src] || null);
  const [currentSrc, setCurrentSrc] = useState<string>(variants?.low || variants?.high || src);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchVariants = async () => {
      if (!src) return;
      if (variantCache[src]) {
        setVariants(variantCache[src]);
        return;
      }

      const fetchedVariants = await getImageVariants(src);
      if (mounted) {
        variantCache[src] = fetchedVariants;
        setVariants(fetchedVariants);
        // Start with low res if available, otherwise original
        if (fetchedVariants.low && !isHighResLoaded) {
          setCurrentSrc(fetchedVariants.low);
        }
      }
    };

    fetchVariants();

    return () => {
      mounted = false;
    };
  }, [src, isHighResLoaded]);

  useEffect(() => {
    if (!variants?.high) return;

    // Preload the high-res image
    const img = new Image();
    img.src = variants.high;
    img.onload = () => {
      setCurrentSrc(variants.high!);
      setIsHighResLoaded(true);
    };
    img.onerror = () => {
      // If high-res fails, we might just keep what we have or set error
      if (!variants.low) setHasError(true);
    };
  }, [variants?.high]);

  const handleError = () => {
    if (!hasError) setHasError(true);
  };

  const finalSrc = hasError && fallbackSrc ? fallbackSrc : currentSrc;

  return (
    <img
      src={finalSrc || ""}
      alt={alt}
      loading="lazy"
      onError={handleError}
      className={cn(
        "transition-opacity duration-500 ease-in-out",
        !isHighResLoaded && currentSrc !== variants?.high ? "blur-sm" : "blur-0",
        className
      )}
      {...props}
    />
  );
}
