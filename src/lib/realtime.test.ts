import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HouseholdRealtimeManager } from './realtime'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import type { Database } from '../types/database'

function createMockChannel(): RealtimeChannel {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  } as unknown as RealtimeChannel
  return channel
}

function createMockSupabase() {
  const channels: RealtimeChannel[] = []

  const client = {
    channel: vi.fn(() => {
      const ch = createMockChannel()
      channels.push(ch)
      return ch
    }),
    removeChannel: vi.fn(),
  } as unknown as SupabaseClient<Database>

  return { client, channels }
}

function createMockQueryClient() {
  return {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient
}

describe('HouseholdRealtimeManager', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>
  let mockQueryClient: ReturnType<typeof createMockQueryClient>
  let manager: HouseholdRealtimeManager

  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockQueryClient = createMockQueryClient()
    manager = new HouseholdRealtimeManager(mockSupabase.client, mockQueryClient)
  })

  afterEach(() => {
    manager.unsubscribe()
  })

  it('starts with no household', () => {
    expect(manager.householdId).toBeNull()
  })

  describe('subscribe', () => {
    it('sets the current householdId', () => {
      manager.subscribe('hh-1')
      expect(manager.householdId).toBe('hh-1')
    })

    it('creates 10 channels (8 household tables + households + meal_plan_ingredients)', () => {
      manager.subscribe('hh-1')
      expect(mockSupabase.client.channel).toHaveBeenCalledTimes(10)
    })

    it('creates channels with correct names', () => {
      manager.subscribe('hh-1')
      const channelNames = (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0]
      )

      expect(channelNames).toContain('meal_plans-hh-1')
      expect(channelNames).toContain('meal_ideas-hh-1')
      expect(channelNames).toContain('todo_items-hh-1')
      expect(channelNames).toContain('reactions-hh-1')
      expect(channelNames).toContain('day_contexts-hh-1')
      expect(channelNames).toContain('ingredients-hh-1')
      expect(channelNames).toContain('day_placeholders-hh-1')
      expect(channelNames).toContain('household_members-hh-1')
      expect(channelNames).toContain('households-hh-1')
      expect(channelNames).toContain('meal-plan-ingredients-hh-1')
    })

    it('subscribes to household table changes filtered by household_id', () => {
      manager.subscribe('hh-1')

      const onCalls = mockSupabase.channels.flatMap((ch) =>
        (ch.on as ReturnType<typeof vi.fn>).mock.calls
      )

      const mealPlansCall = onCalls.find(
        (call) => call[1]?.table === 'meal_plans'
      )
      expect(mealPlansCall).toBeDefined()
      expect(mealPlansCall?.[1]).toMatchObject({
        event: '*',
        schema: 'public',
        table: 'meal_plans',
        filter: 'household_id=eq.hh-1',
      })
    })

    it('subscribes to households table with UPDATE event only', () => {
      manager.subscribe('hh-1')

      const onCalls = mockSupabase.channels.flatMap((ch) =>
        (ch.on as ReturnType<typeof vi.fn>).mock.calls
      )

      const householdsCall = onCalls.find(
        (call) => call[1]?.table === 'households'
      )
      expect(householdsCall).toBeDefined()
      expect(householdsCall?.[1]).toMatchObject({
        event: 'UPDATE',
        schema: 'public',
        table: 'households',
        filter: 'id=eq.hh-1',
      })
    })

    it('subscribes to meal_plan_ingredients without household_id filter', () => {
      manager.subscribe('hh-1')

      const onCalls = mockSupabase.channels.flatMap((ch) =>
        (ch.on as ReturnType<typeof vi.fn>).mock.calls
      )

      const mpiCall = onCalls.find(
        (call) => call[1]?.table === 'meal_plan_ingredients'
      )
      expect(mpiCall).toBeDefined()
      expect(mpiCall?.[1]).toMatchObject({
        event: '*',
        schema: 'public',
        table: 'meal_plan_ingredients',
      })
      expect(mpiCall?.[1].filter).toBeUndefined()
    })

    it('calls subscribe() on each channel', () => {
      manager.subscribe('hh-1')

      for (const ch of mockSupabase.channels) {
        expect(ch.subscribe).toHaveBeenCalledOnce()
      }
    })
  })

  describe('unsubscribe', () => {
    it('removes all channels', () => {
      manager.subscribe('hh-1')
      const channelCount = mockSupabase.channels.length

      manager.unsubscribe()

      expect(mockSupabase.client.removeChannel).toHaveBeenCalledTimes(channelCount)
    })

    it('clears the householdId', () => {
      manager.subscribe('hh-1')
      manager.unsubscribe()
      expect(manager.householdId).toBeNull()
    })

    it('is safe to call when not subscribed', () => {
      expect(() => manager.unsubscribe()).not.toThrow()
    })
  })

  describe('switching households', () => {
    it('unsubscribes from old household before subscribing to new', () => {
      manager.subscribe('hh-1')
      const firstChannels = [...mockSupabase.channels]

      manager.subscribe('hh-2')

      // Old channels should have been removed
      for (const ch of firstChannels) {
        expect(mockSupabase.client.removeChannel).toHaveBeenCalledWith(ch)
      }
      expect(manager.householdId).toBe('hh-2')
    })

    it('creates fresh channels for the new household', () => {
      manager.subscribe('hh-1');
      (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mockClear()

      manager.subscribe('hh-2')

      const channelNames = (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0]
      )
      expect(channelNames).toContain('meal_plans-hh-2')
      expect(channelNames).toContain('households-hh-2')
    })
  })

  describe('cache invalidation callbacks', () => {
    it('invalidates meal-plans AND plan-streak when meal_plans changes', () => {
      manager.subscribe('hh-1')

      // Find the meal_plans channel callback
      const mealPlansChannel = mockSupabase.channels.find((_ch, idx) => {
        const call = (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mock.calls[idx]
        return call[0] === 'meal_plans-hh-1'
      })
      if (!mealPlansChannel) throw new Error('meal_plans channel not found')
      const onCall = (mealPlansChannel.on as ReturnType<typeof vi.fn>).mock.calls[0]
      const callback = onCall[2] as () => void

      callback()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['meal-plans', 'hh-1'],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['plan-streak', 'hh-1'],
      })
    })

    it('invalidates household query key on households UPDATE', () => {
      manager.subscribe('hh-1')

      const householdsChannel = mockSupabase.channels.find((_ch, idx) => {
        const call = (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mock.calls[idx]
        return call[0] === 'households-hh-1'
      })
      if (!householdsChannel) throw new Error('households channel not found')
      const onCall = (householdsChannel.on as ReturnType<typeof vi.fn>).mock.calls[0]
      const callback = onCall[2] as () => void

      callback()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['household', 'hh-1'],
      })
      // Membership-listing query is also stale because the household
      // metadata it joins to may have changed.
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['my-households'],
      })
    })

    it('invalidates both meal-plan-ingredients and meal-plans on MPI change', () => {
      manager.subscribe('hh-1')

      const mpiChannel = mockSupabase.channels.find((_ch, idx) => {
        const call = (mockSupabase.client.channel as ReturnType<typeof vi.fn>).mock.calls[idx]
        return call[0] === 'meal-plan-ingredients-hh-1'
      })
      if (!mpiChannel) throw new Error('meal-plan-ingredients channel not found')
      const onCall = (mpiChannel.on as ReturnType<typeof vi.fn>).mock.calls[0]
      const callback = onCall[2] as () => void

      callback()

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['meal-plan-ingredients', 'hh-1'],
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['meal-plans', 'hh-1'],
      })
      // ingredient usage stats also depend on this join table
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ingredient-usage-stats', 'hh-1'],
      })
    })
  })

  describe('queryKeys.invalidateAfter (used by mutations too)', () => {
    it('exposes the same dependency graph the realtime manager uses', async () => {
      const { invalidateAfter } = await import('./queryKeys')
      const qc = createMockQueryClient()

      invalidateAfter(qc, 'meal_plans', 'hh-1')

      expect(qc.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['meal-plans', 'hh-1'],
      })
      expect(qc.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['plan-streak', 'hh-1'],
      })
    })
  })
})
