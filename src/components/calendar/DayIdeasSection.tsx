import { useMemo, useState } from 'react'
import type { Database } from '../../types/database'
import {
  useCreateMealIdea,
  useDeleteMealIdea,
  useReactions,
  useUpsertReaction,
  useDeleteReaction,
  type ReactionWithProfile,
} from '../../hooks/useMealIdeas'
import { useAuth } from '../../hooks/useAuth'
import { useOverlay } from '../ui/OverlayProvider'
import Tray from '../ui/Tray'
import ReactionButton, {
  type Reactor,
  type ReactionOption,
} from '../ui/ReactionButton'

type MealIdea = Database['public']['Tables']['meal_ideas']['Row']

const THUMB_OPTIONS: ReactionOption[] = [{ emoji: '👍', label: 'Thumbs up' }]

function buildReactors(
  reactions: ReactionWithProfile[],
  currentUserId: string | undefined,
): Reactor[] {
  return reactions.map((r) => ({
    id: r.id,
    displayName: r.profiles?.display_name ?? 'Household member',
    emoji: r.emoji,
    isCurrentUser: !!currentUserId && r.user_id === currentUserId,
  }))
}

interface DayIdeasSectionProps {
  date: string
  householdId: string
  ideas: MealIdea[]
  canPropose: boolean
  canEdit: boolean
  /** Exposes the per-idea thumbs-up count up to the AI prompt section. */
  onThumbsCount?: (counts: Map<string, number>) => void
}

/**
 * Ideas list + add button + add tray + idea-detail tray.
 *
 * Owns its own data for the meal_idea reactions (one query, keyed on
 * the loaded idea ids) and for the two trays. Ratchets the trays
 * through the global `useOverlay` slot so opening one closes any
 * other tray (e.g. the "copy meal" tray in the meals section).
 */
export default function DayIdeasSection({
  date,
  householdId,
  ideas,
  canPropose,
  canEdit,
}: DayIdeasSectionProps) {
  const { user } = useAuth()
  const createIdea = useCreateMealIdea()
  const deleteIdea = useDeleteMealIdea()
  const upsertReaction = useUpsertReaction()
  const removeReaction = useDeleteReaction()

  const [ideaTitle, setIdeaTitle] = useState('')
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const addTray = useOverlay(`day-detail:${date}:add-idea`)
  const detailTray = useOverlay(`day-detail:${date}:idea-detail`)

  const ideaIdsKey = ideas.map((i) => i.id).join('|')
  const ideaIds = useMemo(
    () => (ideaIdsKey ? ideaIdsKey.split('|') : []),
    [ideaIdsKey],
  )
  const { data: reactions = [] } = useReactions(householdId, 'meal_idea', ideaIds)

  const reactionsByIdeaId = useMemo(() => {
    const byIdeaId = new Map<string, ReactionWithProfile[]>()
    for (const r of reactions) {
      const cur = byIdeaId.get(r.target_id) ?? []
      cur.push(r)
      byIdeaId.set(r.target_id, cur)
    }
    return byIdeaId
  }, [reactions])

  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId) ?? null
  const selectedReactions = selectedIdeaId
    ? (reactionsByIdeaId.get(selectedIdeaId) ?? [])
    : []
  const selectedThumbs = selectedReactions.filter((r) => r.emoji === '👍')
  const hasSelectedThumb =
    !!user && selectedThumbs.some((r) => r.user_id === user.id)

  const handleAddIdea = async () => {
    const trimmed = ideaTitle.trim()
    if (!trimmed) return
    await createIdea.mutateAsync({
      household_id: householdId,
      date,
      title: trimmed,
    })
    setIdeaTitle('')
    addTray.close()
  }

  const handleReact = async (ideaId: string, emoji: string) => {
    if (!user) return
    await upsertReaction.mutateAsync({
      household_id: householdId,
      target_type: 'meal_idea',
      target_id: ideaId,
      emoji,
      user_id: user.id,
    })
  }

  const handleUnreact = async (ideaId: string) => {
    if (!user) return
    await removeReaction.mutateAsync({
      householdId,
      targetType: 'meal_idea',
      targetId: ideaId,
      emoji: '👍',
      userId: user.id,
    })
  }

  const handleDeleteIdea = async (ideaId: string) => {
    await deleteIdea.mutateAsync({ id: ideaId, householdId })
    if (selectedIdeaId === ideaId) {
      setSelectedIdeaId(null)
      detailTray.close()
    }
  }

  const openDetail = (ideaId: string) => {
    setSelectedIdeaId(ideaId)
    detailTray.open()
  }

  const closeDetail = () => {
    setSelectedIdeaId(null)
    detailTray.close()
  }

  return (
    <>
      {ideas.length > 0 && (
        <div className="space-y-2" data-testid="ideas-list">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Ideas
          </h4>
          {ideas.map((idea) => {
            const ideaRxns = reactionsByIdeaId.get(idea.id) ?? []
            const reactors = buildReactors(ideaRxns, user?.id)
            const currentUserEmoji =
              ideaRxns.find((r) => r.user_id === user?.id && r.emoji === '👍')?.emoji ?? null
            return (
              <IdeaCard
                key={idea.id}
                idea={idea}
                reactors={reactors}
                currentUserEmoji={currentUserEmoji}
                onOpen={() => openDetail(idea.id)}
                onReact={(emoji) => handleReact(idea.id, emoji)}
                onUnreact={() => handleUnreact(idea.id)}
              />
            )
          })}
        </div>
      )}

      {canPropose && (
        <button
          type="button"
          onClick={() => addTray.open()}
          className="w-full rounded-lg border-2 border-dashed border-indigo-200 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
          data-testid="add-idea-button"
        >
          + Add idea
        </button>
      )}

      <Tray
        isOpen={addTray.isOpen}
        onClose={addTray.close}
        title="Add an idea"
        description="Capture a meal idea for this day"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            placeholder="e.g. Burgers"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoFocus
            data-testid="meal-idea-input"
          />
          <button
            type="button"
            onClick={handleAddIdea}
            disabled={createIdea.isPending || !ideaTitle.trim()}
            className="w-full rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            data-testid="save-idea-button"
          >
            {createIdea.isPending ? 'Saving…' : 'Save idea'}
          </button>
        </div>
      </Tray>

      <Tray
        isOpen={detailTray.isOpen && !!selectedIdea}
        onClose={closeDetail}
        title={selectedIdea?.title ?? 'Idea'}
        description="See reactions from your household"
      >
        {selectedIdea && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reactions
              </p>
              <ReactionButton
                options={THUMB_OPTIONS}
                reactors={buildReactors(selectedReactions, user?.id)}
                currentUserEmoji={hasSelectedThumb ? '👍' : null}
                onReact={(emoji) => handleReact(selectedIdea.id, emoji)}
                onUnreact={() => handleUnreact(selectedIdea.id)}
                disabled={upsertReaction.isPending || removeReaction.isPending}
                targetLabel={selectedIdea.title}
                testId={`idea-detail-reaction-${selectedIdea.id}`}
              />
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => handleDeleteIdea(selectedIdea.id)}
                disabled={deleteIdea.isPending}
                className="w-full rounded-xl bg-red-50 py-3 text-base font-semibold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-100 disabled:opacity-50"
                data-testid="delete-idea-button"
              >
                Delete idea
              </button>
            )}
          </div>
        )}
      </Tray>
    </>
  )
}

interface IdeaCardProps {
  idea: MealIdea
  reactors: Reactor[]
  currentUserEmoji: string | null
  onOpen: () => void
  onReact: (emoji: string) => void | Promise<void>
  onUnreact: () => void | Promise<void>
}

function IdeaCard({
  idea,
  reactors,
  currentUserEmoji,
  onOpen,
  onReact,
  onUnreact,
}: IdeaCardProps) {
  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left ring-1 ring-indigo-100"
      data-testid={`idea-card-${idea.id}`}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-gray-900">{idea.title}</p>
      </button>
      <ReactionButton
        options={THUMB_OPTIONS}
        reactors={reactors}
        currentUserEmoji={currentUserEmoji}
        onReact={onReact}
        onUnreact={onUnreact}
        size="sm"
        targetLabel={idea.title}
        testId={`idea-reaction-${idea.id}`}
      />
    </div>
  )
}

// Helper for the parent's AI prompt generator lives in `./dayIdeas` so
// this file can stay component-only (React Fast Refresh requirement).
