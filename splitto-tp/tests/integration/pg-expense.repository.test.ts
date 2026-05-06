import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import type { Expense } from '../../src/domain/types';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';

describe('PgExpenseRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repo: PgExpenseRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });

    const migrationPath = resolve(process.cwd(), 'migrations', '001-initial.sql');
    const migrationSql = await readFile(migrationPath, 'utf8');
    await pool.query(migrationSql);

    repo = new PgExpenseRepository(pool);
  }, 90_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE expenses CASCADE');
    await pool.query('TRUNCATE groups CASCADE');
  });

  it('save() puis findById() retourne la même expense', async () => {
    await seedGroupWithMembers(pool, 'g1', ['alice', 'bob', 'charlie']);
    const expense = makeExpense({
      id: 'exp-1',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 42.5,
      paidAt: new Date('2026-05-06T08:00:00.000Z'),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });

    await repo.save(expense);
    const found = await repo.findById('exp-1');

    expect(found).toEqual(expense);
  });

  it('findByGroupId() retourne uniquement les expenses du groupe demandé', async () => {
    await seedGroupWithMembers(pool, 'g1', ['alice', 'bob']);
    await seedGroupWithMembers(pool, 'g2', ['zoe']);

    const expense1 = makeExpense({
      id: 'exp-g1-a',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 10,
      paidAt: new Date('2026-05-06T10:00:00.000Z'),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
    });
    const expense2 = makeExpense({
      id: 'exp-g1-b',
      groupId: 'g1',
      paidBy: 'bob',
      amount: 20,
      paidAt: new Date('2026-05-06T12:00:00.000Z'),
      split: { mode: 'weighted', weights: { alice: 1, bob: 2 } },
    });
    const otherGroupExpense = makeExpense({
      id: 'exp-g2-a',
      groupId: 'g2',
      paidBy: 'zoe',
      amount: 99,
      paidAt: new Date('2026-05-07T10:00:00.000Z'),
      split: { mode: 'equal', beneficiaries: ['zoe'] },
    });

    await repo.save(expense1);
    await repo.save(expense2);
    await repo.save(otherGroupExpense);

    const found = await repo.findByGroupId('g1');
    expect(found).toHaveLength(2);
    expect(found.map((e) => e.id)).toEqual(['exp-g1-b', 'exp-g1-a']);
  });

  it('findInDateRange() filtre correctement avec bornes inclusives', async () => {
    await seedGroupWithMembers(pool, 'g1', ['alice']);

    const from = new Date('2026-05-06T10:00:00.000Z');
    const to = new Date('2026-05-06T12:00:00.000Z');
    const before = makeExpense({
      id: 'exp-before',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 10,
      paidAt: new Date('2026-05-06T09:59:59.000Z'),
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });
    const atFrom = makeExpense({
      id: 'exp-from',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 11,
      paidAt: from,
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });
    const atTo = makeExpense({
      id: 'exp-to',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 12,
      paidAt: to,
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });
    const after = makeExpense({
      id: 'exp-after',
      groupId: 'g1',
      paidBy: 'alice',
      amount: 13,
      paidAt: new Date('2026-05-06T12:00:01.000Z'),
      split: { mode: 'equal', beneficiaries: ['alice'] },
    });

    await repo.save(before);
    await repo.save(atFrom);
    await repo.save(atTo);
    await repo.save(after);

    const found = await repo.findInDateRange('g1', from, to);
    expect(found.map((e) => e.id)).toEqual(['exp-to', 'exp-from']);
  });

  it('la contrainte UNIQUE(group_id, paid_at, amount, paid_by) rejette un doublon', async () => {
    await seedGroupWithMembers(pool, 'g1', ['alice']);
    const paidAt = new Date('2026-05-06T10:00:00.000Z');

    await repo.save(
      makeExpense({
        id: 'exp-1',
        groupId: 'g1',
        paidBy: 'alice',
        amount: 50,
        paidAt,
        split: { mode: 'equal', beneficiaries: ['alice'] },
      }),
    );

    await expect(
      repo.save(
        makeExpense({
          id: 'exp-2',
          groupId: 'g1',
          paidBy: 'alice',
          amount: 50,
          paidAt,
          split: { mode: 'equal', beneficiaries: ['alice'] },
        }),
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('une transaction qui échoue rollback proprement (aucune ligne sauvegardée)', async () => {
    await seedGroupWithMembers(pool, 'g1', ['alice']);
    const paidAt = new Date('2026-05-06T10:00:00.000Z');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const txRepo = new PgExpenseRepository(client as unknown as Pool);

      await txRepo.save(
        makeExpense({
          id: 'exp-tx-1',
          groupId: 'g1',
          paidBy: 'alice',
          amount: 80,
          paidAt,
          split: { mode: 'equal', beneficiaries: ['alice'] },
        }),
      );

      await expect(
        txRepo.save(
          makeExpense({
            id: 'exp-tx-2',
            groupId: 'g1',
            paidBy: 'alice',
            amount: 80,
            paidAt,
            split: { mode: 'equal', beneficiaries: ['alice'] },
          }),
        ),
      ).rejects.toMatchObject({ code: '23505' });

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM expenses WHERE group_id = $1',
      ['g1'],
    );
    expect(rows[0].count).toBe(0);
  });
});

async function seedGroupWithMembers(pool: Pool, groupId: string, memberIds: string[]): Promise<void> {
  await pool.query(
    'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
    [groupId, `Group ${groupId}`, 'EUR'],
  );

  for (const memberId of memberIds) {
    await pool.query(
      'INSERT INTO members (id, group_id, name, email) VALUES ($1, $2, $3, $4)',
      [memberId, groupId, memberId, `${memberId}@test.dev`],
    );
  }
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-default',
    groupId: 'g-default',
    description: 'Expense',
    amount: 10,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date('2026-05-06T10:00:00.000Z'),
    split: { mode: 'equal', beneficiaries: ['alice'] },
    createdAt: new Date('2026-05-06T10:01:00.000Z'),
    ...overrides,
  };
}
