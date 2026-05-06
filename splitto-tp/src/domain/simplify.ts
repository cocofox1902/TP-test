// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

type Party = { id: string; amount: number };

export function simplifyDebts(balances: Balances): Settlement[] {
  const { creditors, debtors } = splitParties(balances);

  const settlements: Settlement[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]!;
    const debtor = debtors[debtorIndex]!;
    const amount = transferAmount(creditor, debtor);

    settlements.push(makeSettlement(debtor.id, creditor.id, amount));

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) {
      creditorIndex += 1;
    }
    if (debtor.amount === 0) {
      debtorIndex += 1;
    }
  }

  return settlements;
}

function splitParties(balances: Balances): { creditors: Party[]; debtors: Party[] } {
  const creditors: Party[] = [];
  const debtors: Party[] = [];

  for (const [memberId, balance] of Object.entries(balances)) {
    if (balance > 0) {
      creditors.push({ id: memberId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id: memberId, amount: -balance });
    }
  }

  return { creditors, debtors };
}

function transferAmount(creditor: Party, debtor: Party): number {
  return Math.min(creditor.amount, debtor.amount);
}

function makeSettlement(from: string, to: string, amount: number): Settlement {
  return { from, to, amount };
}
