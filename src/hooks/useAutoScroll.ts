import { useEffect, useRef, useCallback } from "react";

interface UseAutoScrollOptions {
  /**
   * Dependencies that trigger auto-scroll when changed (e.g., messages, chat)
   */
  dependencies: unknown[];
  /**
   * Pixel distance from the very bottom that still counts as "at bottom".
   * Defaults to 20 px for touchpad-friendly sensitivity.
   */
  bottomThreshold?: number;
}

export function useAutoScroll({ dependencies, bottomThreshold = 20 }: UseAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  const scrollToBottom = () => {
    const container = containerRef.current;
    const bottom = bottomRef.current;

    if (!container || !bottom) return;

    // Mark next scroll event as programmatic so handleScroll can ignore it.
    isProgrammaticScrollRef.current = true;

    const clearProgrammatic = () => {
      isProgrammaticScrollRef.current = false;
      container.removeEventListener("scroll", clearProgrammatic);
    };

    // Clear the flag on the first scroll event that fires after scrollIntoView.
    container.addEventListener("scroll", clearProgrammatic, { once: true });

    // Scroll to the very bottom to ensure the last message is fully visible
    // Use scrollTop for precise control instead of scrollIntoView
    const targetScrollTop = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  };

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Throttle scroll events for better performance
    const throttledCheck = () => {
      // Check if user is at bottom (with very sensitive threshold for touchpad)
      // Make it much easier to disable auto-scroll with small scroll movements
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isAtBottom = scrollBottom < bottomThreshold + 10; // Much more sensitive
      isAutoScrollEnabledRef.current = isAtBottom;
    };

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(throttledCheck);
  }, [bottomThreshold]);

  const enableAutoScroll = useCallback(() => {
    isAutoScrollEnabledRef.current = true;
    scrollToBottom();
  }, []);

  // Auto-scroll when dependencies change - respect user intent during streaming
  useEffect(() => {
    // Only auto-scroll if the user is already at the bottom or if this is a new message
    if (isAutoScrollEnabledRef.current) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    containerRef,
    bottomRef,
    handleScroll,
    enableAutoScroll,
    isAutoScrollEnabled: isAutoScrollEnabledRef,
  };
}