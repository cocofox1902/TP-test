import { describe, expect, it } from 'vitest';

import { simplifyDebts } from '../../src/domain/simplify';

describe('simplifyDebts', () => {
  it('2 personnes: crée un seul règlement du débiteur vers le créditeur', () => {
    expect(simplifyDebts({ a: 10, b: -10 })).toEqual([
      { from: 'b', to: 'a', amount: 10 },
    ]);
  });
});
