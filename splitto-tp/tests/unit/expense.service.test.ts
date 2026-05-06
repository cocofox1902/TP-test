import { describe, expect, it, vi } from 'vitest';

import { ExpenseService } from '../../src/domain/expense.service';
import type { CreateExpenseInput, Expense } from '../../src/domain/types';
import type { Clock } from '../../src/ports/clock';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';
import type { EmailNotifier } from '../../src/ports/notifier';

class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly data = new Map<string, Expense>();

  async save(expense: Expense): Promise<void> {
    this.data.set(expense.id, expense);
  }

  async findById(id: string): Promise<Expense | null> {
    return this.data.get(id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return [...this.data.values()].filter((expense) => expense.groupId === groupId);
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    return [...this.data.values()].filter(
      (expense) => expense.groupId === groupId && expense.paidAt >= from && expense.paidAt <= to,
    );
  }
}

describe('ExpenseService.create', () => {
  const fixedNow = new Date('2026-05-06T10:00:00.000Z');
  const baseInput: CreateExpenseInput = {
    groupId: 'group-1',
    description: 'Diner',
    amount: 120,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date('2026-05-05T20:00:00.000Z'),
    split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
  };

  it('retourne la bonne expense, sauvegarde en repo et notifie si amount >= 100', async () => {
    const fakeRepo = new InMemoryExpenseRepository();

    const stubClock: Clock = {
      now: () => fixedNow,
    };

    const mockIdGenerator: IdGenerator = {
      next: vi.fn(() => 'exp-123'),
    };

    const spyCalls: Array<{ groupId: string; message: string }> = [];
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: async (groupId, message) => {
        spyCalls.push({ groupId, message });
      },
    };

    const dummyLogger: Logger = {
      info: () => {},
      error: () => {},
    };

    const service = new ExpenseService(
      fakeRepo,
      spyNotifier,
      stubClock,
      mockIdGenerator,
      dummyLogger,
    );

    const expense = await service.create(baseInput);

    expect(expense).toEqual({
      ...baseInput,
      id: 'exp-123',
      createdAt: fixedNow,
    });

    const saved = await fakeRepo.findById('exp-123');
    expect(saved).toEqual(expense);

    expect(spyCalls).toHaveLength(1);
    expect(spyCalls[0]).toEqual({
      groupId: 'group-1',
      message: 'Nouvelle dépense importante : Diner (120€)',
    });

    expect(mockIdGenerator.next).toHaveBeenCalledTimes(1);
  });

  it("n'appelle PAS le notifier si amount < 100", async () => {
    const fakeRepo = new InMemoryExpenseRepository();

    const stubClock: Clock = {
      now: () => fixedNow,
    };

    const mockIdGenerator: IdGenerator = {
      next: vi.fn(() => 'exp-124'),
    };

    const spyCalls: Array<{ groupId: string; message: string }> = [];
    const spyNotifier: EmailNotifier = {
      notifyGroupMembers: async (groupId, message) => {
        spyCalls.push({ groupId, message });
      },
    };

    const dummyLogger: Logger = {
      info: () => {},
      error: () => {},
    };

    const service = new ExpenseService(
      fakeRepo,
      spyNotifier,
      stubClock,
      mockIdGenerator,
      dummyLogger,
    );

    const expense = await service.create({ ...baseInput, amount: 99, description: 'Cafe' });

    expect(expense).toEqual({
      ...baseInput,
      amount: 99,
      description: 'Cafe',
      id: 'exp-124',
      createdAt: fixedNow,
    });

    const saved = await fakeRepo.findById('exp-124');
    expect(saved).toEqual(expense);

    expect(spyCalls).toHaveLength(0);
    expect(mockIdGenerator.next).toHaveBeenCalledTimes(1);
  });
});
