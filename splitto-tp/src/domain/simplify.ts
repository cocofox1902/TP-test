// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

type PartyCents = { id: string; cents: number };

export function simplifyDebts(balances: Balances): Settlement[] {
  const { creditors, debtors } = splitPartiesInCents(balances);

  const settlements: Settlement[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]!;
    const debtor = debtors[debtorIndex]!;
    const transferCents = transferAmount(creditor, debtor);

    settlements.push(makeSettlement(debtor.id, creditor.id, fromCents(transferCents)));

    creditor.cents -= transferCents;
    debtor.cents -= transferCents;

    if (isSettled(creditor)) {
      creditorIndex += 1;
    }
    if (isSettled(debtor)) {
      debtorIndex += 1;
    }
  }

  return settlements;
}

function splitPartiesInCents(balances: Balances): { creditors: PartyCents[]; debtors: PartyCents[] } {
  const creditors: PartyCents[] = [];
  const debtors: PartyCents[] = [];

  for (const [memberId, balance] of Object.entries(balances)) {
    const cents = toCents(balance);
    if (cents > 0) {
      creditors.push({ id: memberId, cents });
    } else if (cents < 0) {
      debtors.push({ id: memberId, cents: -cents });
    }
  }

  return { creditors, debtors };
}

function transferAmount(creditor: PartyCents, debtor: PartyCents): number {
  return Math.min(creditor.cents, debtor.cents);
}

function isSettled(party: PartyCents): boolean {
  return party.cents === 0;
}

function makeSettlement(from: string, to: string, amount: number): Settlement {
  return { from, to, amount };
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}
