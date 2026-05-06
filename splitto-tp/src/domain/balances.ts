// src/domain/balances.ts — calcul des soldes d'un groupe
//
// EXERCICE 1 — À COMPLÉTER
//
// Spec : voir SUJET.md, exercice 1
//
// Cette fonction est PURE : pas d'effets de bord, pas d'I/O.
// Elle prend un groupe et ses dépenses, retourne les soldes.

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  const balances: Balances = {};

  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    const totalCents = toCents(expense.amount);
    addCents(balances, expense.paidBy, totalCents);

    const shares = getSharesInCents(totalCents, expense);
    for (const [memberId, share] of Object.entries(shares)) {
      addCents(balances, memberId, -share);
    }
  }

  for (const memberId of Object.keys(balances)) {
    balances[memberId] = fromCents(toCents(balances[memberId]));
  }

  return balances;
}

function getSharesInCents(totalCents: number, expense: Expense): Record<string, number> {
  switch (expense.split.mode) {
    case 'equal':
      return splitEqual(totalCents, expense.split.beneficiaries);
    case 'weighted':
      return splitByRatios(totalCents, expense.split.weights);
    case 'percentage':
      return splitByRatios(totalCents, expense.split.percentages);
  }
}

function splitEqual(totalCents: number, beneficiaries: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (beneficiaries.length === 0) {
    return result;
  }

  const base = Math.floor(totalCents / beneficiaries.length);
  let remainder = totalCents - base * beneficiaries.length;

  for (const memberId of beneficiaries) {
    const extra = remainder > 0 ? 1 : 0;
    result[memberId] = (result[memberId] ?? 0) + base + extra;
    remainder -= extra;
  }

  return result;
}

function splitByRatios(totalCents: number, ratios: Record<string, number>): Record<string, number> {
  const entries = Object.entries(ratios).filter(([, ratio]) => ratio > 0);
  const result: Record<string, number> = {};
  if (entries.length === 0 || totalCents === 0) {
    return result;
  }

  const totalRatio = entries.reduce((sum, [, ratio]) => sum + ratio, 0);
  let allocated = 0;
  const remainders: Array<{ memberId: string; value: number }> = [];

  for (const [memberId, ratio] of entries) {
    const rawShare = (totalCents * ratio) / totalRatio;
    const floored = Math.floor(rawShare);
    result[memberId] = floored;
    allocated += floored;
    remainders.push({ memberId, value: rawShare - floored });
  }

  let remainder = totalCents - allocated;
  remainders.sort((a, b) => b.value - a.value);
  for (let i = 0; i < remainder; i += 1) {
    result[remainders[i % remainders.length].memberId] += 1;
  }

  return result;
}

function addCents(balances: Balances, memberId: string, cents: number): void {
  const currentCents = toCents(balances[memberId] ?? 0);
  balances[memberId] = fromCents(currentCents + cents);
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}
