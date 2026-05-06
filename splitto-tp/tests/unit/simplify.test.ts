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

  it('répartit un débiteur unique vers plusieurs créditeurs', () => {
    expect(simplifyDebts({ a: 15, b: 5, c: -20 })).toEqual([
      { from: 'c', to: 'a', amount: 15 },
      { from: 'c', to: 'b', amount: 5 },
    ]);
  });

  it('répartit plusieurs débiteurs vers un créditeur unique', () => {
    expect(simplifyDebts({ a: 20, b: -15, c: -5 })).toEqual([
      { from: 'b', to: 'a', amount: 15 },
      { from: 'c', to: 'a', amount: 5 },
    ]);
  });

  it("ignore les soldes nuls et retourne une liste vide si tout est équilibré", () => {
    expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([]);
  });
});
