// src/infrastructure/pg-expense.repository.ts
//
// EXERCICE 4 — À COMPLÉTER
//
// Implémentation Postgres du ExpenseRepository.
// À tester avec Testcontainers (voir SUJET.md exercice 4).

import type { Pool } from 'pg';
import type { Expense } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async save(expense: Expense): Promise<void> {
    await this.pool.query(
      `INSERT INTO expenses
        (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category, created_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
      [
        expense.id,
        expense.groupId,
        expense.description,
        expense.amount,
        expense.currency,
        expense.paidBy,
        expense.paidAt,
        expense.split.mode,
        JSON.stringify(getSplitData(expense)),
        expense.category ?? null,
        expense.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Expense | null> {
    const { rows } = await this.pool.query(
      `SELECT
         id, group_id, description, amount, currency, paid_by, paid_at,
         split_mode, split_data, category, created_at
       FROM expenses
       WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    return mapExpenseRow(rows[0]);
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const { rows } = await this.pool.query(
      `SELECT
         id, group_id, description, amount, currency, paid_by, paid_at,
         split_mode, split_data, category, created_at
       FROM expenses
       WHERE group_id = $1
       ORDER BY paid_at DESC, id ASC`,
      [groupId],
    );

    return rows.map(mapExpenseRow);
  }

  async findInDateRange(
    groupId: string,
    from: Date,
    to: Date,
  ): Promise<Expense[]> {
    const { rows } = await this.pool.query(
      `SELECT
         id, group_id, description, amount, currency, paid_by, paid_at,
         split_mode, split_data, category, created_at
       FROM expenses
       WHERE group_id = $1
         AND paid_at >= $2
         AND paid_at <= $3
       ORDER BY paid_at DESC, id ASC`,
      [groupId, from, to],
    );

    return rows.map(mapExpenseRow);
  }
}

function getSplitData(expense: Expense): Record<string, unknown> {
  switch (expense.split.mode) {
    case 'equal':
      return { beneficiaries: expense.split.beneficiaries };
    case 'weighted':
      return { weights: expense.split.weights };
    case 'percentage':
      return { percentages: expense.split.percentages };
  }
}

function mapExpenseRow(row: any): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    paidAt: new Date(row.paid_at),
    split: mapSplit(row.split_mode, row.split_data),
    category: row.category ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function mapSplit(
  mode: 'equal' | 'weighted' | 'percentage',
  data: Record<string, unknown> | null,
): Expense['split'] {
  const splitData = data ?? {};
  switch (mode) {
    case 'equal':
      return {
        mode: 'equal',
        beneficiaries: Array.isArray(splitData.beneficiaries)
          ? (splitData.beneficiaries as string[])
          : [],
      };
    case 'weighted':
      return {
        mode: 'weighted',
        weights: (splitData.weights as Record<string, number>) ?? {},
      };
    case 'percentage':
      return {
        mode: 'percentage',
        percentages: (splitData.percentages as Record<string, number>) ?? {},
      };
  }
}
