import { expect, type Page } from '@playwright/test';

export class GroupPage {
  constructor(private readonly page: Page) {}

  async expectGroupVisible(name: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 2, name: new RegExp(name) })).toBeVisible();
  }

  async addExpense(params: {
    description: string;
    amount: string;
    paidBy: string;
    beneficiaries: string[];
  }): Promise<void> {
    await this.page.getByRole('button', { name: 'Ajouter une dépense' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Ajouter une dépense' })).toBeVisible();

    await this.page.getByLabel('Description').fill(params.description);
    await this.page.getByLabel('Montant').fill(params.amount);
    await this.page.getByLabel('Payé par').selectOption({ label: params.paidBy });
    // Les bénéficiaires sont cochés par défaut par l'UI.

    await this.page
      .getByRole('dialog', { name: 'Ajouter une dépense' })
      .getByRole('button', { name: 'Ajouter' })
      .click();
  }

  async expectExpenseVisible(description: string, amount: string): Promise<void> {
    await expect(this.page.getByRole('row', { name: new RegExp(`${description}.*${amount}`) })).toBeVisible();
  }

  async expectBalance(memberName: string, amount: string): Promise<void> {
    await expect(this.page.getByRole('row', { name: new RegExp(`${memberName}.*${amount}`) })).toBeVisible();
  }

  async settleFirstSuggestion(): Promise<void> {
    await this.page.getByRole('button', { name: 'Régler' }).first().click();
  }

  async expectSettlementCount(count: number): Promise<void> {
    await expect(this.page.getByTestId(/settlement-row-/)).toHaveCount(count);
  }
}
