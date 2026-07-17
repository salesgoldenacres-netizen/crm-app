import MobileCardList, { MobileCardListProps } from "@/shared/components/ui/MobileCardList";

/**
 * MobileCardRenderer (Wave 8 Phase 2D)
 * Thin adapter delegating to the canonical MobileCardList primitive.
 * Zero behaviour change — this is purely an adapter for RendererFactory.
 */
export default function MobileCardRenderer<T>(props: MobileCardListProps<T>) {
  return <MobileCardList {...props} />;
}
