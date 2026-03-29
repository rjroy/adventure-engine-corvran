import { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import "./BackgroundLayer.css";

/**
 * BackgroundLayer component with two-layer crossfade transitions.
 *
 * Implements fade+blur transitions per TD-7:
 * - Two absolutely-positioned image layers for smooth crossfade
 * - New image loads in hidden layer, fades in on load
 * - Blur filter during transition to hide loading artifacts
 * - GPU-accelerated CSS transitions for 60fps performance
 * - No visible "blank" states during image loading
 */
export function BackgroundLayer() {
  const { backgroundUrl } = useTheme();
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [inactiveSrc, setInactiveSrc] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<"layer-a" | "layer-b">("layer-a");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track the current background URL to detect changes
  const currentUrlRef = useRef<string | null>(null);
  // Track if we've ever loaded an image
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // If backgroundUrl hasn't changed, do nothing
    if (backgroundUrl === currentUrlRef.current) {
      return;
    }

    // Update current URL reference
    currentUrlRef.current = backgroundUrl;

    // If no background URL, clear both layers
    if (!backgroundUrl) {
      setActiveSrc(null);
      setInactiveSrc(null);
      hasLoadedRef.current = false;
      return;
    }

    // If this is the first image, just set it directly (no transition)
    if (!hasLoadedRef.current) {
      setActiveSrc(backgroundUrl);
      hasLoadedRef.current = true;
      return;
    }

    // Preload new image before transitioning
    const img = new Image();

    img.onload = () => {
      // Set the new image in the inactive layer
      if (activeLayer === "layer-a") {
        setInactiveSrc(backgroundUrl);
      } else {
        setActiveSrc(backgroundUrl);
      }

      // Start transition
      setIsTransitioning(true);

      // After a brief moment, swap the active layer
      // This gives React time to render the new image before we start the CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setActiveLayer(activeLayer === "layer-a" ? "layer-b" : "layer-a");
        });
      });
    };

    img.onerror = () => {
      console.warn(`Failed to load background image: ${backgroundUrl}`);
      // On error, don't transition - keep the current background
    };

    // Start loading the image
    img.src = backgroundUrl;
  }, [backgroundUrl, activeLayer]);

  // Clear transition flag after CSS transition completes
  // Use transitionend event instead of timeout for accuracy
  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1500); // Match default transition duration from ThemeContext

    return () => clearTimeout(timer);
  }, [isTransitioning]);

  // Don't render anything if we've never loaded an image
  if (!activeSrc && !inactiveSrc) {
    return null;
  }

  return (
    <div className="background-layer">
      {activeSrc && (
        <img
          className={`background-layer__image background-layer__image--layer-a ${
            activeLayer === "layer-a" ? "background-layer__image--active" : ""
          } ${isTransitioning ? "background-layer__image--transitioning" : ""}`}
          src={activeSrc}
          alt=""
          aria-hidden="true"
        />
      )}
      {inactiveSrc && (
        <img
          className={`background-layer__image background-layer__image--layer-b ${
            activeLayer === "layer-b" ? "background-layer__image--active" : ""
          } ${isTransitioning ? "background-layer__image--transitioning" : ""}`}
          src={inactiveSrc}
          alt=""
          aria-hidden="true"
        />
      )}
    </div>
  );
}
