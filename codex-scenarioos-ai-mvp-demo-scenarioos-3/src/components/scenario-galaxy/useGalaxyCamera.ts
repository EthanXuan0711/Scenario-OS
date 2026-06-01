// ScenarioGalaxy 相机 hook
// 根据当前聚焦节点，计算图谱组的目标变换（平移 + 缩放）。
// 实际的缓动由 GalaxyCanvas 中 motion.g 的 spring 过渡完成，这里只产出目标值。

import { useMemo } from "react";
import { VIEW_H, VIEW_W, type CameraState, type ScenarioNode } from "./galaxyTypes";

// 总览态：略微缩小，留出呼吸空间，并保持画布中心不动。
const OVERVIEW_SCALE = 0.94;
// 聚焦态：放大并将目标节点移到视口中心，形成"镜头推进"感。
const FOCUS_SCALE = 1.72;

export function useGalaxyCamera(focusNode: ScenarioNode | null): CameraState {
  return useMemo<CameraState>(() => {
    if (!focusNode) {
      const cx = VIEW_W / 2;
      const cy = VIEW_H / 2;
      return {
        x: cx - cx * OVERVIEW_SCALE,
        y: cy - cy * OVERVIEW_SCALE,
        scale: OVERVIEW_SCALE
      };
    }
    return {
      x: VIEW_W / 2 - focusNode.x * FOCUS_SCALE,
      y: VIEW_H / 2 - focusNode.y * FOCUS_SCALE,
      scale: FOCUS_SCALE
    };
  }, [focusNode]);
}
