import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useResizableSplitPane({
  disabled = false,
  defaultSplitPercent = 50,
  collapseThresholdPercent = 10,
} = {}) {
  const splitContainerRef = useRef(null);
  const [splitPercent, setSplitPercent] = useState(defaultSplitPercent);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const resetSplitLayout = useCallback(() => {
    setCollapsedPane(null);
    setSplitPercent(defaultSplitPercent);
  }, [defaultSplitPercent]);

  const collapseLeftPane = useCallback(() => {
    setCollapsedPane("left");
    setSplitPercent(defaultSplitPercent);
  }, [defaultSplitPercent]);

  const collapseRightPane = useCallback(() => {
    setCollapsedPane("right");
    setSplitPercent(defaultSplitPercent);
  }, [defaultSplitPercent]);

  const startSplitDrag = useCallback(
    (event) => {
      if (disabled || collapsedPane) return;
      event.preventDefault();
      setIsDraggingSplit(true);
    },
    [collapsedPane, disabled],
  );

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (event) => {
      const container = splitContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;

      if (nextPercent <= collapseThresholdPercent) {
        collapseLeftPane();
        setIsDraggingSplit(false);
        return;
      }

      if (nextPercent >= 100 - collapseThresholdPercent) {
        collapseRightPane();
        setIsDraggingSplit(false);
        return;
      }

      const clampedPercent = Math.max(
        collapseThresholdPercent,
        Math.min(100 - collapseThresholdPercent, nextPercent),
      );

      setCollapsedPane(null);
      setSplitPercent(clampedPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [
    collapseLeftPane,
    collapseRightPane,
    collapseThresholdPercent,
    isDraggingSplit,
  ]);

  const panelWidths = useMemo(
    () => ({
      left: collapsedPane === "right" ? "100%" : `${splitPercent}%`,
      right: collapsedPane === "left" ? "100%" : `${100 - splitPercent}%`,
    }),
    [collapsedPane, splitPercent],
  );

  return {
    splitContainerRef,
    splitPercent,
    collapsedPane,
    isDraggingSplit,
    panelWidths,
    setSplitPercent,
    setCollapsedPane,
    resetSplitLayout,
    startSplitDrag,
    collapseLeftPane,
    collapseRightPane,
  };
}
