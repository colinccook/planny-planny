import { describe, it, expect } from 'vitest'
import {
  ACCESS_LEVELS,
  canEditMeals,
  canInviteMembers,
  canManageEvents,
  canManageMembers,
  canProposeIdeas,
  canSeeEvents,
  canSeeIdeas,
  canSeeMeals,
  canSeeVoters,
  canVote,
  roleLabel,
  type Audience,
} from './permissions'

const AUDIENCES: Audience[] = [
  'owner',
  'member',
  'honoured_guest',
  'voting_guest',
  'public',
  null,
]

// (audience, predicate) => expected. Acts as a single, exhaustive
// access-control matrix. Every permission predicate the app uses
// must appear here for every audience.
type Row = [
  Audience,
  boolean, // canEditMeals
  boolean, // canManageEvents
  boolean, // canProposeIdeas
  boolean, // canVote
  boolean, // canSeeVoters
  boolean, // canSeeEvents
  boolean, // canSeeMeals
  boolean, // canSeeIdeas
  boolean, // canInviteMembers
  boolean, // canManageMembers
]

const MATRIX: Row[] = [
  // audience       edit  events propose vote seeVoters seeEvents seeMeals seeIdeas invite manage
  ['owner',          true,  true,  true,  true,  true,  true,  true,  true,  true,  true],
  ['member',         true,  true,  true,  true,  true,  true,  true,  true,  true,  false],
  ['honoured_guest', true,  true,  true,  true,  true,  true,  true,  true,  false, false],
  ['voting_guest',   false, false, false, true,  true,  true,  true,  true,  false, false],
  ['public',         false, false, false, false, false, false, true,  true,  false, false],
  [null,             false, false, false, false, false, false, false, false, false, false],
]

describe('permissions', () => {
  describe.each(MATRIX)(
    'audience: %s',
    (
      audience,
      edit,
      events,
      propose,
      vote,
      seeVoters,
      seeEvents,
      seeMeals,
      seeIdeas,
      invite,
      manage,
    ) => {
      it(`canEditMeals = ${edit}`, () => {
        expect(canEditMeals(audience)).toBe(edit)
      })
      it(`canManageEvents = ${events}`, () => {
        expect(canManageEvents(audience)).toBe(events)
      })
      it(`canProposeIdeas = ${propose}`, () => {
        expect(canProposeIdeas(audience)).toBe(propose)
      })
      it(`canVote = ${vote}`, () => {
        expect(canVote(audience)).toBe(vote)
      })
      it(`canSeeVoters = ${seeVoters}`, () => {
        expect(canSeeVoters(audience)).toBe(seeVoters)
      })
      it(`canSeeEvents = ${seeEvents}`, () => {
        expect(canSeeEvents(audience)).toBe(seeEvents)
      })
      it(`canSeeMeals = ${seeMeals}`, () => {
        expect(canSeeMeals(audience)).toBe(seeMeals)
      })
      it(`canSeeIdeas = ${seeIdeas}`, () => {
        expect(canSeeIdeas(audience)).toBe(seeIdeas)
      })
      it(`canInviteMembers = ${invite}`, () => {
        expect(canInviteMembers(audience)).toBe(invite)
      })
      it(`canManageMembers = ${manage}`, () => {
        expect(canManageMembers(audience)).toBe(manage)
      })
    },
  )

  it('covers every audience in MATRIX', () => {
    expect(MATRIX.map((row) => row[0])).toEqual(AUDIENCES)
  })

  describe('roleLabel', () => {
    it('returns friendly labels for each access level', () => {
      expect(roleLabel('owner')).toBe('Owner')
      expect(roleLabel('member')).toBe('Member')
      expect(roleLabel('honoured_guest')).toBe('Honoured Guest')
      expect(roleLabel('voting_guest')).toBe('Voting Guest')
      expect(roleLabel('public')).toBe('Public Link')
    })

    it('falls back gracefully for unknown roles', () => {
      expect(roleLabel(null)).toBe('No access')
      expect(roleLabel(undefined)).toBe('No access')
      expect(roleLabel('something-else')).toBe('something-else')
    })
  })

  describe('ACCESS_LEVELS', () => {
    it('lists all five audiences in order from most to least privileged', () => {
      expect(ACCESS_LEVELS.map((l) => l.key)).toEqual([
        'owner',
        'member',
        'honoured_guest',
        'voting_guest',
        'public',
      ])
    })

    it('every level has at least one bullet describing what they can do', () => {
      for (const level of ACCESS_LEVELS) {
        expect(level.can.length).toBeGreaterThan(0)
        expect(level.summary).not.toBe('')
      }
    })

    it('honoured guest description mentions inability to invite', () => {
      const honoured = ACCESS_LEVELS.find((l) => l.key === 'honoured_guest')
      expect(honoured).toBeDefined()
      expect((honoured?.cannot ?? []).join(' ')).toMatch(/invite/i)
    })

    it('member description mentions ability to invite', () => {
      const member = ACCESS_LEVELS.find((l) => l.key === 'member')
      expect(member).toBeDefined()
      expect((member?.can ?? []).join(' ')).toMatch(/invite/i)
    })
  })
})
