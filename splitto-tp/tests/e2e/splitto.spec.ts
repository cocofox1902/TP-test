import { test, expect } from '@playwright/test';

import { GroupPage } from './group.page';
import { HomePage } from './home.page';

test.describe('Splitto E2E', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/_test/reset');
  });

  test('créer un groupe avec 3 membres', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();
    await home.createGroup({
      name: 'Weekend Lisbonne',
      membersMultiline: 'Alice <alice@test.dev>\nBob <bob@test.dev>\nCharlie <charlie@test.dev>',
    });

    await expect(page.getByRole('listitem').first()).toContainText('Weekend Lisbonne');
  });

  test('ajouter une dépense dans un groupe existant', async ({ page }) => {
    const home = new HomePage(page);
    const group = new GroupPage(page);

    await home.goto();
    await home.createGroup({
      name: 'Roadtrip',
      membersMultiline: 'Alice <alice@test.dev>\nBob <bob@test.dev>\nCharlie <charlie@test.dev>',
    });

    await home.openGroup('Roadtrip');
    await group.addExpense({
      description: 'Pizza',
      amount: '30',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await group.expectExpenseVisible('Pizza', '30.00 EUR');
  });

  test('voir les soldes mis à jour après une dépense de 30€ payée par Alice pour 3 personnes', async ({ page }) => {
    const home = new HomePage(page);
    const group = new GroupPage(page);

    await home.goto();
    await home.createGroup({
      name: 'Coloc',
      membersMultiline: 'Alice <alice@test.dev>\nBob <bob@test.dev>\nCharlie <charlie@test.dev>',
    });

    await home.openGroup('Coloc');
    await group.expectGroupVisible('Coloc');
    await group.addExpense({
      description: 'Courses',
      amount: '30',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await group.expectBalance('Alice', '20.00 EUR');
    await group.expectBalance('Bob', '-10.00 EUR');
    await group.expectBalance('Charlie', '-10.00 EUR');
  });

  test('marquer un règlement comme réglé le fait disparaître de la liste', async ({ page }) => {
    const home = new HomePage(page);
    const group = new GroupPage(page);

    await home.goto();
    await home.createGroup({
      name: 'Remboursements',
      membersMultiline: 'Alice <alice@test.dev>\nBob <bob@test.dev>\nCharlie <charlie@test.dev>',
    });

    await home.openGroup('Remboursements');
    await group.addExpense({
      description: 'Restaurant',
      amount: '30',
      paidBy: 'Alice',
      beneficiaries: ['Alice', 'Bob', 'Charlie'],
    });

    await group.expectSettlementCount(2);
    await group.settleFirstSuggestion();
    await group.expectSettlementCount(1);
  });
});
