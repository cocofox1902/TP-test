import { describe, expect, it } from 'vitest';

import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {
  it('2 personnes: crée un seul règlement du débiteur vers le créditeur', () => {
    expect(simplifyDebts({ a: 10, b: -10 })).toEqual([
      { from: 'b', to: 'a', amount: 10 },
    ]);
  });

  it('triangle: ne passe pas par un intermédiaire inutile', () => {
    expect(simplifyDebts({ a: 10, b: 0, c: -10 })).toEqual([
      { from: 'c', to: 'a', amount: 10 },
    ]);
  });

  it('4 personnes: produit 2 règlements minimum', () => {
    expect(simplifyDebts({ a: 30, b: -20, c: -10, d: 0 })).toEqual([
      { from: 'b', to: 'a', amount: 20 },
      { from: 'c', to: 'a', amount: 10 },
    ]);
  });

  it('gère correctement les décimaux (0.3, 0.2, 0.1) sans erreur flottante', () => {
    expect(simplifyDebts({ a: 0.3, b: -0.2, c: -0.1 })).toEqual([
      { from: 'b', to: 'a', amount: 0.2 },
      { from: 'c', to: 'a', amount: 0.1 },
    ]);
  });
});
