import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { type ReactNode, useEffect, useRef } from "react";
import { BackgroundLayer } from "../../src/components/BackgroundLayer";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";

// Store mock image instances for manual control
let mockImageInstances: MockImage[] = [];

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Don't auto-trigger - let tests control when onload fires
  }

  constructor() {
    mockImageInstances.push(this);
  }

  // Test helper to simulate successful load
  simulateLoad() {
    if (this.onload) {
      this.onload();
    }
  }

  // Test helper to simulate load error
  simulateError() {
    if (this.onerror) {
      this.onerror();
    }
  }
}

// Simple test wrapper
function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// Test wrapper that exposes applyTheme for controlled testing
function TestWrapper({
  children,
  onMount,
}: {
  children: ReactNode;
  onMount?: (applyTheme: (url: string | null) => void) => void;
}) {
  return (
    <ThemeProvider>
      <TestHelper onMount={onMount} />
      {children}
    </ThemeProvider>
  );
}

// Helper component that captures applyTheme from context
function TestHelper({
  onMount,
}: {
  onMount?: (applyTheme: (url: string | null) => void) => void;
}) {
  const { applyTheme } = useTheme();
  const calledRef = useRef(false);

  useEffect(() => {
    if (onMount && !calledRef.current) {
      calledRef.current = true;
      // Expose a simplified applyTheme that just sets the background URL
      onMount((url: string | null) => {
        applyTheme({ mood: "calm", backgroundUrl: url });
      });
    }
  }, [applyTheme, onMount]);

  return null;
}

// Helper to flush all pending timers and microtasks
async function flushTimersAndMicrotasks() {
  await act(async () => {
    // Run all timers
    vi.runAllTimers();
    // Allow React to process updates
    await Promise.resolve();
  });
}

// Helper to apply background URL and wait for state to settle
async function applyBackgroundAndWait(
  setBackgroundUrl: (url: string | null) => void,
  url: string | null
) {
  act(() => {
    setBackgroundUrl(url);
  });
  // ThemeContext has debounce, run timers to process it
  await flushTimersAndMicrotasks();
}

describe("BackgroundLayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockImageInstances = [];
    globalThis.Image = MockImage as unknown as typeof Image;

    // Mock requestAnimationFrame to execute immediately in tests
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    // Suppress console.log from ThemeContext
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    test("renders nothing when no background URL is set", () => {
      const { container } = render(
        <Wrapper>
          <BackgroundLayer />
        </Wrapper>
      );

      expect(container.querySelector(".background-layer")).toBeNull();
    });

    test("renders container when background URL is provided", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Initially nothing rendered
      expect(container.querySelector(".background-layer")).toBeNull();

      // Apply a background URL
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/image1.jpg"
      );

      // Should render container with image
      expect(container.querySelector(".background-layer")).not.toBeNull();
    });
  });

  describe("structure", () => {
    test("uses BEM naming convention for CSS classes", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/image1.jpg"
      );

      const layer = container.querySelector(".background-layer");
      expect(layer).not.toBeNull();

      const image = container.querySelector(".background-layer__image");
      expect(image).not.toBeNull();

      // Verify BEM modifier classes
      expect(
        container.querySelector(".background-layer__image--layer-a")
      ).not.toBeNull();
    });

    test("background images have accessibility attributes", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/image1.jpg"
      );

      const images = container.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);

      images.forEach((img) => {
        expect(img).toHaveAttribute("alt", "");
        expect(img).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("image load sequence", () => {
    test("first image loads directly without preloading", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      // First image should load directly (no Image preloading for first image)
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("http://example.com/first.jpg");

      // No MockImage instances should be created for first image
      // (component sets activeSrc directly without preloading)
      expect(mockImageInstances.length).toBe(0);
    });

    test("subsequent images preload before rendering", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      // Clear mock instances from any previous operations
      mockImageInstances = [];

      // Load second image - should use Image preloading
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      // An Image instance should have been created for preloading
      expect(mockImageInstances.length).toBe(1);
      expect(mockImageInstances[0].src).toBe("http://example.com/second.jpg");

      // Before onload, second image should NOT be in the DOM yet
      const imagesBeforeLoad = container.querySelectorAll("img");
      const srcsBefore = Array.from(imagesBeforeLoad).map((img) =>
        img.getAttribute("src")
      );
      expect(srcsBefore).not.toContain("http://example.com/second.jpg");

      // Simulate successful load
      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // After onload, second image should be in the DOM
      const imagesAfterLoad = container.querySelectorAll("img");
      const srcsAfter = Array.from(imagesAfterLoad).map((img) =>
        img.getAttribute("src")
      );
      expect(srcsAfter).toContain("http://example.com/second.jpg");
    });

    test("same URL does not trigger re-render", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/same.jpg"
      );

      mockImageInstances = [];

      // Try to load same URL again
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/same.jpg"
      );

      // No new Image instance should be created (URL hasn't changed)
      expect(mockImageInstances.length).toBe(0);
    });
  });

  describe("layer swap logic", () => {
    test("activeLayer starts as layer-a", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      const layerA = container.querySelector(
        ".background-layer__image--layer-a"
      );
      expect(layerA).not.toBeNull();
      expect(layerA).toHaveClass("background-layer__image--active");
    });

    test("second image goes to inactive layer then swaps active", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image (layer-a becomes active)
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Load second image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      // Before onload, layer-a should still be active
      let layerA = container.querySelector(".background-layer__image--layer-a");
      expect(layerA).toHaveClass("background-layer__image--active");

      // Simulate successful preload
      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // After onload and rAF, layer-b should become active
      const layerB = container.querySelector(
        ".background-layer__image--layer-b"
      );
      expect(layerB).not.toBeNull();
      expect(layerB).toHaveClass("background-layer__image--active");

      // layer-a should no longer have --active
      layerA = container.querySelector(".background-layer__image--layer-a");
      expect(layerA).not.toHaveClass("background-layer__image--active");
    });

    test("third image swaps back to layer-a", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Load second image and trigger load
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // Verify layer-b is now active
      let layerB = container.querySelector(".background-layer__image--layer-b");
      expect(layerB).toHaveClass("background-layer__image--active");

      mockImageInstances = [];

      // Load third image and trigger load
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/third.jpg"
      );

      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // After third image, layer-a should be active again
      const layerA = container.querySelector(
        ".background-layer__image--layer-a"
      );
      expect(layerA).toHaveClass("background-layer__image--active");

      layerB = container.querySelector(".background-layer__image--layer-b");
      expect(layerB).not.toHaveClass("background-layer__image--active");
    });

    test("both layers exist simultaneously during transition", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Load second image and trigger load
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // During transition, both layers should exist
      const layerA = container.querySelector(
        ".background-layer__image--layer-a"
      );
      const layerB = container.querySelector(
        ".background-layer__image--layer-b"
      );

      expect(layerA).not.toBeNull();
      expect(layerB).not.toBeNull();
    });
  });

  describe("transition state", () => {
    test("isTransitioning applies blur class during transition", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Load second image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      // Trigger load to start transition
      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // During transition, images should have --transitioning class
      const transitioning = container.querySelectorAll(
        ".background-layer__image--transitioning"
      );
      expect(transitioning.length).toBeGreaterThan(0);
    });

    test("transition clears after 1500ms", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Load second image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/second.jpg"
      );

      act(() => {
        mockImageInstances[0].simulateLoad();
      });

      // Verify transitioning class is present
      let transitioning = container.querySelectorAll(
        ".background-layer__image--transitioning"
      );
      expect(transitioning.length).toBeGreaterThan(0);

      // Advance timers past transition duration (1500ms)
      act(() => {
        vi.advanceTimersByTime(1600);
      });

      // Transitioning class should be removed
      transitioning = container.querySelectorAll(
        ".background-layer__image--transitioning"
      );
      expect(transitioning.length).toBe(0);
    });
  });

  describe("error handling", () => {
    test("handles image load errors gracefully", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image successfully
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/first.jpg"
      );

      mockImageInstances = [];

      // Try to load second image that will fail
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/broken.jpg"
      );

      // Simulate error
      act(() => {
        mockImageInstances[0].simulateError();
      });

      // Component should not crash
      expect(container).toBeTruthy();

      // Warning should be logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to load background image: http://example.com/broken.jpg"
      );

      // First image should still be displayed (graceful degradation)
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toBe("http://example.com/first.jpg");

      consoleWarnSpy.mockRestore();
    });

    test("keeps current background on load error", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load first image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/good.jpg"
      );

      mockImageInstances = [];

      // Try to load broken image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/broken.jpg"
      );

      act(() => {
        mockImageInstances[0].simulateError();
      });

      // layer-a should still be active with original image
      const layerA = container.querySelector(
        ".background-layer__image--layer-a"
      );
      expect(layerA).toHaveClass("background-layer__image--active");
      expect(layerA?.getAttribute("src")).toBe("http://example.com/good.jpg");
    });
  });

  describe("clearing background", () => {
    test("clearing URL clears both layers", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      // Load an image
      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/image.jpg"
      );

      // Verify image is displayed
      expect(container.querySelector("img")).not.toBeNull();

      // Clear the background URL
      await applyBackgroundAndWait(setBackgroundUrl!, null);

      // Container should no longer render
      expect(container.querySelector(".background-layer")).toBeNull();
    });
  });

  describe("component integration", () => {
    test("integrates with ThemeContext via useTheme hook", () => {
      const { container } = render(
        <Wrapper>
          <BackgroundLayer />
        </Wrapper>
      );

      // Component uses useTheme() to access backgroundUrl
      // Verified by not throwing "useTheme must be used within ThemeProvider"
      expect(container).toBeTruthy();
    });

    test("does not interfere with UI interaction", async () => {
      let setBackgroundUrl: ((url: string | null) => void) | null = null;

      const { container } = render(
        <TestWrapper
          onMount={(fn) => {
            setBackgroundUrl = fn;
          }}
        >
          <BackgroundLayer />
        </TestWrapper>
      );

      await applyBackgroundAndWait(
        setBackgroundUrl!,
        "http://example.com/image.jpg"
      );

      // Background layer should exist
      const layer = container.querySelector(".background-layer");
      expect(layer).not.toBeNull();

      // pointer-events: none is in CSS, verified by the CSS file
      // This test verifies the component structure allows the CSS to work
    });
  });
});
