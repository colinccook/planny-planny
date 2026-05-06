import type { ReactionWithProfile } from '../../hooks/useMealIdeas'

/**
 * Per-idea thumbs-up count derived from a flat reactions array.
 * Used by the AI prompt generator to highlight the most popular ideas.
 *
 * Lives in its own module so consumers can import it without pulling in
 * the heavy `DayIdeasSection` component (and so React Fast Refresh stays
 * happy — the component file then exports components only).
 */
export function thumbsByIdeaId(
  reactions: ReactionWithProfile[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of reactions) {
    if (r.emoji !== '👍') continue
    counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1)
  }
  return counts
}
