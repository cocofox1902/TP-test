import { expect, type Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { level: 1, name: 'Splitto' })).toBeVisible();
  }

  async createGroup(params: {
    name: string;
    currency?: 'EUR' | 'USD' | 'GBP' | 'CHF';
    membersMultiline: string;
  }): Promise<void> {
    await this.page.getByRole('button', { name: 'Nouveau groupe' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Créer un groupe' })).toBeVisible();

    await this.page.getByLabel('Nom du groupe').fill(params.name);
    if (params.currency) {
      await this.page.getByLabel('Devise').selectOption(params.currency);
    }
    await this.page
      .getByLabel('Membres (un par ligne, format : Nom <email>)')
      .fill(params.membersMultiline);

    await this.page
      .getByRole('dialog', { name: 'Créer un groupe' })
      .getByRole('button', { name: 'Créer' })
      .click();

    await expect(this.page.getByRole('dialog', { name: 'Créer un groupe' })).toBeHidden({
      timeout: 15_000,
    });
    const groupItems = this.page.getByRole('listitem');
    await expect(groupItems).toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(groupItems.first()).toContainText(params.name);
  }

  async openGroup(name: string): Promise<void> {
    const groupItem = this.page.getByRole('listitem').filter({ hasText: name });
    await expect(groupItem).toBeVisible({ timeout: 15_000 });
    await groupItem.click();
  }
}
