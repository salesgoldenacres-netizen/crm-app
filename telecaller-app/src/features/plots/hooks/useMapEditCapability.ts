import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

/**
 * Wave 10 Agent 8 — Map edit gating.
 *
 * Geometry editing relies on precise mouse/trackpad interactions (vertex drag,
 * edge insert, free-select marquee). Full Pointer Events migration is deferred.
 * Gate edit tools on coarse/touch-primary devices; keep view/pan/zoom available.
 *
 * Unlock when the device has a fine pointer (mouse/trackpad) OR viewport is lg+
 * with a fine pointer available via any-pointer (docked keyboard/mouse hybrids).
 */
export function useMapEditCapability() {
  const hasFinePointer = useMediaQuery("(any-pointer: fine)");
  const isCoarsePrimary = useMediaQuery("(pointer: coarse)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");

  // Prefer never enabling broken silent touch editing.
  // Full editor: fine pointer always; or lg+ when not coarse-primary-only.
  const canEditMaps = hasFinePointer || (isLgUp && !isCoarsePrimary);

  return {
    canEditMaps,
    isTouchPrimary: isCoarsePrimary && !hasFinePointer,
  };
}
