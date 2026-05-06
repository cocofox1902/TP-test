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
});
