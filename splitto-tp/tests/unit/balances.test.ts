import { describe, expect, it } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Expense, Group, Member } from '../../src/domain/types';

const alice: Member = { id: 'alice', name: 'Alice', email: 'alice@test.dev' };
const bob: Member = { id: 'bob', name: 'Bob', email: 'bob@test.dev' };
const charlie: Member = { id: 'charlie', name: 'Charlie', email: 'charlie@test.dev' };

const group: Group = {
  id: 'group-1',
  name: 'Weekend',
  currency: 'EUR',
  members: [alice, bob, charlie],
};

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    groupId: group.id,
    description: 'Expense',
    amount: 0,
    currency: 'EUR',
    paidBy: alice.id,
    paidAt: new Date('2026-01-01T00:00:00.000Z'),
    split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('computeBalances', () => {
  it('returns 0 balances for all group members with empty expenses', () => {
    expect(computeBalances(group, [])).toEqual({
      alice: 0,
      bob: 0,
      charlie: 0,
    });
  });

  it('handles one equal split including payer', () => {
    const e = expense({
      amount: 30,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 20,
      bob: -10,
      charlie: -10,
    });
  });

  it('handles one equal split excluding payer', () => {
    const e = expense({
      amount: 30,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [bob.id, charlie.id] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 30,
      bob: -15,
      charlie: -15,
    });
  });

  it('handles multiple expenses that offset each other', () => {
    const e1 = expense({
      id: 'exp-1',
      amount: 60,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });
    const e2 = expense({
      id: 'exp-2',
      amount: 30,
      paidBy: bob.id,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });

    expect(computeBalances(group, [e1, e2])).toEqual({
      alice: 30,
      bob: 0,
      charlie: -30,
    });
  });

  it('handles weighted split with non-uniform weights', () => {
    const e = expense({
      amount: 60,
      paidBy: alice.id,
      split: { mode: 'weighted', weights: { alice: 1, bob: 2, charlie: 3 } },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 50,
      bob: -20,
      charlie: -30,
    });
  });

  it('handles percentage split with cent rounding', () => {
    const e = expense({
      amount: 100,
      paidBy: alice.id,
      split: {
        mode: 'percentage',
        percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 },
      },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 66.67,
      bob: -33.33,
      charlie: -33.34,
    });
  });

  it('keeps old expense members even if removed from group', () => {
    const smallerGroup: Group = { ...group, members: [alice, bob] };
    const e = expense({
      amount: 90,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });

    expect(computeBalances(smallerGroup, [e])).toEqual({
      alice: 60,
      bob: -30,
      charlie: -30,
    });
  });

  it('supports amount 0', () => {
    const e = expense({
      amount: 0,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 0,
      bob: 0,
      charlie: 0,
    });
  });

  it('supports single beneficiary equal split (payer itself)', () => {
    const e = expense({
      amount: 42,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [alice.id] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 0,
      bob: 0,
      charlie: 0,
    });
  });

  it('keeps full credit on payer when equal split has no beneficiaries', () => {
    const e = expense({
      amount: 25,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 25,
      bob: 0,
      charlie: 0,
    });
  });

  it('ignores non-positive ratios in weighted split', () => {
    const e = expense({
      amount: 60,
      paidBy: alice.id,
      split: { mode: 'weighted', weights: { alice: 0, bob: -2, charlie: 3 } },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 60,
      bob: 0,
      charlie: -60,
    });
  });

  it('returns no split deductions for zero total in percentage mode', () => {
    const e = expense({
      amount: 0,
      paidBy: bob.id,
      split: { mode: 'percentage', percentages: { alice: 40, bob: 60 } },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 0,
      bob: 0,
      charlie: 0,
    });
  });

  it('distributes equal split remainder cents deterministically', () => {
    const e = expense({
      amount: 100,
      paidBy: alice.id,
      split: { mode: 'equal', beneficiaries: [alice.id, bob.id, charlie.id] },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 66.66,
      bob: -33.33,
      charlie: -33.33,
    });
  });

  it('returns all credit to payer when weighted split has no positive ratio', () => {
    const e = expense({
      amount: 60,
      paidBy: alice.id,
      split: { mode: 'weighted', weights: { alice: 0, bob: -1, charlie: 0 } },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 60,
      bob: 0,
      charlie: 0,
    });
  });

  it('allocates weighted remainder to highest fractional share', () => {
    const e = expense({
      amount: 100,
      paidBy: alice.id,
      split: { mode: 'weighted', weights: { alice: 1, bob: 2, charlie: 3 } },
    });

    expect(computeBalances(group, [e])).toEqual({
      alice: 83.33,
      bob: -33.33,
      charlie: -50,
    });
  });

  it('keeps balances normalized to cents after many tiny expenses', () => {
    const expenses: Expense[] = [];
    for (let i = 0; i < 20; i += 1) {
      expenses.push(
        expense({
          id: `tiny-${i}`,
          amount: 0.1,
          paidBy: i % 2 === 0 ? alice.id : bob.id,
          split: { mode: 'equal', beneficiaries: [alice.id, bob.id] },
        }),
      );
    }

    expect(computeBalances(group, expenses)).toEqual({
      alice: 0,
      bob: 0,
      charlie: 0,
    });
  });
});
