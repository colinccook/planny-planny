// @ChatGPTPlugin #UnitTesting #Backend #ChatGptPlugin
import { describe, expect, it, vi } from 'vitest'
import { listPluginHouseholds, resolvePluginHousehold, switchPluginHousehold } from './pluginHouseholds'

const home = { id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd10', name: 'Home' }
const beach = { id: 'eaed8f18-c9e8-4f01-a9fa-fab14486fd11', name: 'Beach' }

function client(
  memberships = [{ role: 'owner', households: home }],
  selected: string | null = null,
) {
  const profile = { last_household_id: selected }
  interface ProfileResult { data: typeof profile | null; error: { message: string } | null }
  const update = vi.fn((patch: typeof profile) => {
    Object.assign(profile, patch)
    return query
  })
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: memberships, error: null }),
    maybeSingle: vi.fn<() => Promise<ProfileResult>>(async () => ({ data: profile, error: null })),
    update,
    single: vi.fn<() => Promise<ProfileResult>>(async () => ({ data: profile, error: null })),
  }
  const from = vi.fn().mockReturnValue(query)
  return {
    // The fake implements only the query operations used by this service.
    supabase: { from } as unknown as Parameters<typeof listPluginHouseholds>[0],
    from, query, profile,
  }
}

describe('MCP household selection', () => {
  it('uses the sole membership without a saved selection', async () => {
    const { supabase } = client()
    expect(await resolvePluginHousehold(supabase, 'user')).toMatchObject(home)
  })

  it('recovers a stale selection when only one membership remains', async () => {
    const { supabase } = client(undefined, beach.id)
    expect(await resolvePluginHousehold(supabase, 'user')).toMatchObject(home)
  })

  it('lists memberships and the app selection without requiring plugin access', async () => {
    const { supabase, from, query } = client([
      { role: 'owner', households: home },
      { role: 'voting_guest', households: beach },
    ], beach.id)
    expect(await listPluginHouseholds(supabase, 'user')).toEqual({
      households: [
        { ...home, role: 'owner', can_use_plugin: true },
        { ...beach, role: 'voting_guest', can_use_plugin: false },
      ],
      active_household_id: beach.id,
    })
    expect(from).toHaveBeenCalledWith('household_members')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user')
    expect(query.eq).toHaveBeenCalledWith('id', 'user')
  })

  it('follows a changed app selection on the next call', async () => {
    const { supabase, profile } = client([
      { role: 'owner', households: home },
      { role: 'member', households: beach },
    ], home.id)
    expect(await resolvePluginHousehold(supabase, 'user')).toMatchObject(home)
    profile.last_household_id = beach.id
    expect(await resolvePluginHousehold(supabase, 'user')).toMatchObject(beach)
  })

  it.each([null, 'unavailable'])('asks for a choice instead of guessing between households (%s)', async (saved) => {
    const { supabase } = client([
      { role: 'owner', households: home },
      { role: 'member', households: beach },
    ], saved)
    expect((await listPluginHouseholds(supabase, 'user')).active_household_id).toBeNull()
    await expect(resolvePluginHousehold(supabase, 'user')).rejects.toThrow('switch_household')
  })

  it('returns an empty list when there are no memberships', async () => {
    const { supabase } = client([])
    expect(await listPluginHouseholds(supabase, 'user')).toEqual({
      households: [], active_household_id: null,
    })
    await expect(resolvePluginHousehold(supabase, 'user')).rejects.toThrow('list_households')
  })

  it.each(['owner', 'member', 'honoured_guest'])('persists a switch for a %s and scopes later calls to it', async (role) => {
    const { supabase, query } = client([
      { role: 'owner', households: home },
      { role, households: beach },
    ], home.id)
    expect(await switchPluginHousehold(supabase, 'user', beach.id)).toMatchObject({
      household: { ...beach, role },
    })
    expect(query.update).toHaveBeenCalledWith({ last_household_id: beach.id })
    expect(await resolvePluginHousehold(supabase, 'user')).toMatchObject(beach)
  })

  it('rejects a non-member target without changing the saved selection', async () => {
    const { supabase, query } = client(undefined, home.id)
    await expect(switchPluginHousehold(supabase, 'user', beach.id)).rejects.toThrow('unavailable')
    expect(query.update).not.toHaveBeenCalled()
    await expect(resolvePluginHousehold(supabase, 'user', beach.id)).rejects.toThrow('unavailable')
  })

  it('does not let a voting guest switch or use data tools', async () => {
    const { supabase, query } = client([{ role: 'voting_guest', households: home }])
    await expect(switchPluginHousehold(supabase, 'user', home.id)).rejects.toThrow('access level')
    await expect(resolvePluginHousehold(supabase, 'user')).rejects.toThrow('access level')
    expect(query.update).not.toHaveBeenCalled()
  })

  it('does not turn a profile read failure into an automatic selection', async () => {
    const { supabase, query } = client()
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'Read failed' } })
    await expect(resolvePluginHousehold(supabase, 'user')).rejects.toThrow('Read failed')
  })

  it('reports a failed switch instead of claiming the preference was saved', async () => {
    const { supabase, query } = client()
    query.single.mockResolvedValueOnce({ data: null, error: { message: 'Write failed' } })
    await expect(switchPluginHousehold(supabase, 'user', home.id)).rejects.toThrow('Write failed')
  })
})
