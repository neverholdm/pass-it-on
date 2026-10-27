import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { BasePage } from './BasePage';

export type DemoRole = 'Giver' | 'Applicant';

const identityLabels: Record<DemoRole, string> = {
  Giver: 'Item Giver',
  Applicant: 'Item Requester',
};

export class PassItOnDemoPage extends BasePage {
  readonly path = '/demo/browse';

  constructor(page: Page) {
    super(page);
  }

  async openAs(role: DemoRole): Promise<void> {
    await this.page.goto(this.path);
    await this.switchTo(role);
  }

  async switchTo(role: DemoRole): Promise<void> {
    const label = identityLabels[role];
    await this.page.getByRole('button', { name: label, exact: true }).click();
    await expect(this.page.getByText(`Signed in as ${label}`)).toBeVisible();
  }

  async giveItem(name: string, category: string, description: string): Promise<void> {
    await this.page.goto('/demo/give');
    await this.page.getByLabel('Item name').fill(name);
    await this.page.getByRole('combobox', { name: 'Category' }).click();
    await this.page.getByRole('option', { name: category, exact: true }).click();
    await this.page.getByLabel('Description').fill(description);
    await this.page.getByRole('button', { name: 'Publish free item' }).click();
    await expect(this.page.getByRole('heading', { name, exact: true })).toBeVisible();
  }

  async searchAndOpen(name: string): Promise<void> {
    await this.page.goto('/demo/browse');
    await this.page.getByLabel('Search items').fill(name);
    await this.page.getByRole('button', { name: 'Search', exact: true }).click();
    await this.itemCard(name).getByRole('link', { name: 'View item' }).click();
    await expect(this.page.getByRole('heading', { name, exact: true })).toBeVisible();
  }

  async searchItems(search: string): Promise<void> {
    await this.page.getByLabel('Search items').fill(search);
    await this.page.getByRole('button', { name: 'Search', exact: true }).click();
  }

  async itemDetailsPath(name: string): Promise<string> {
    const href = await this.itemCard(name)
      .getByRole('link', { name: 'View item' })
      .getAttribute('href');
    if (!href) throw new Error(`No item details link found for ${name}.`);
    return href;
  }

  async postMessage(message: string): Promise<void> {
    await this.page.getByLabel('Add a public message').fill(message);
    await this.page.getByRole('button', { name: 'Post message' }).click();
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async applyForItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'Apply for this item' }).click();
    await expect(this.page).toHaveURL(/\/demo\/activity$/);
  }

  async goToActivity(): Promise<void> {
    await this.page.goto('/demo/activity');
    await expect(this.page.getByRole('heading', { name: 'My activity' })).toBeVisible();
  }

  async approve(itemName: string): Promise<void> {
    const pendingCard = this.receivedCard(itemName).filter({ hasText: 'Pending' });
    await expect(pendingCard).toContainText('Pending');
    await pendingCard.getByRole('button', { name: 'Approve' }).click();
    await expect(this.receivedCard(itemName).filter({ hasText: 'Confirmed' })).toBeVisible();
  }

  async decline(itemName: string): Promise<void> {
    const pendingCard = this.receivedCard(itemName).filter({ hasText: 'Pending' });
    await pendingCard.getByRole('button', { name: 'Decline' }).click();
    await expect(this.receivedCard(itemName).filter({ hasText: 'Not selected' })).toBeVisible();
  }

  async confirmReceived(itemName: string): Promise<void> {
    const activeCard = this.applicationCard(itemName).filter({
      has: this.page.getByRole('button', { name: 'Confirm received' }),
    });
    await activeCard.getByRole('button', { name: 'Confirm received' }).click();
    await expect(this.applicationCard(itemName).filter({ hasText: 'Completed' })).toBeVisible();
  }

  async cancelApplication(itemName: string): Promise<void> {
    const activeCard = this.applicationCard(itemName).filter({
      has: this.page.getByRole('button', { name: 'Cancel application' }),
    });
    await activeCard.getByRole('button', { name: 'Cancel application' }).click();
    await expect(this.applicationCard(itemName).filter({ hasText: 'Cancelled' })).toBeVisible();
  }

  async gotoImpact(): Promise<void> {
    await this.page.goto('/demo/impact');
    await expect(this.page.getByText('Simulated demo data')).toBeVisible();
  }

  async completedGiveaways(): Promise<string | null> {
    return this.testId('completed-giveaways').innerText();
  }

  async expectCompletedGiveaways(count: string): Promise<void> {
    await expect(this.testId('completed-giveaways')).toContainText(count);
  }

  async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectHeading(text: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text, exact: true })).toBeVisible();
  }

  async resetDemo(): Promise<void> {
    await this.openAs('Giver');
    await this.goToActivity();
    await this.page.getByRole('button', { name: 'Reset demo' }).click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm reset' }).click();
    await expect(this.testId('giver-item-card')).toHaveCount(3);
  }

  async cancelReset(): Promise<void> {
    await this.switchTo('Giver');
    await this.goToActivity();
    await this.page.getByRole('button', { name: 'Reset demo' }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(this.testId('giver-item-card')).toHaveCount(3);
  }

  async itemCount(): Promise<number> {
    return this.testId('demo-item-card').count();
  }

  async expectItemCount(count: number): Promise<void> {
    await expect(this.testId('demo-item-card')).toHaveCount(count);
  }

  async expectItemStatus(itemName: string, status: string): Promise<void> {
    await expect(this.itemCard(itemName)).toContainText(status);
  }

  async selectCategory(category: string): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Category' }).click();
    await this.page.getByRole('option', { name: category, exact: true }).click();
  }

  async clearFilters(): Promise<void> {
    await this.page.getByRole('button', { name: 'Clear', exact: true }).click();
  }

  async expectEmptyResults(): Promise<void> {
    await expect(this.page.getByText('No items match those filters')).toBeVisible();
  }

  async firstItemDetails(): Promise<void> {
    await this.testId('demo-item-card').first().getByRole('link', { name: 'View item' }).click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async expectApplicationStatus(itemName: string, status: string): Promise<void> {
    await expect(this.applicationCard(itemName)).toContainText(status);
  }

  async repeatCompletion(itemName: string): Promise<void> {
    const api = this.page.context().request;
    const activityUrl = new URL('/api/demo/activity/', this.page.url()).toString();
    const activityResponse = await api.get(activityUrl);
    expect(activityResponse.status()).toBe(200);
    const activity = (await activityResponse.json()) as {
      applications: Array<{ id: string; item: { name: string }; status: string }>;
    };
    const bookingId = activity.applications.find(
      booking => booking.item.name === itemName && booking.status === 'Completed',
    )?.id;
    if (!bookingId) throw new Error(`No booking id found for ${itemName}.`);
    const csrfToken = (await this.page.context().cookies()).find(cookie => cookie.name === 'csrftoken')?.value;
    const response = await this.page.context().request.post(
      new URL(`/api/demo/activity/${bookingId}/confirm-received/`, this.page.url()).toString(),
      { headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined },
    );
    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('Completed');
  }

  async expectGiverItemCount(count: number): Promise<void> {
    await expect(this.testId('giver-item-card')).toHaveCount(count);
  }

  async expectApplicationCount(count: number): Promise<void> {
    await expect(this.testId('application-card')).toHaveCount(count);
  }

  async expectReceivedCount(count: number): Promise<void> {
    await expect(this.testId('received-card')).toHaveCount(count);
  }

  async assertNoHorizontalOverflow(): Promise<void> {
    const size = await this.page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(size.content).toBeLessThanOrEqual(size.viewport);
  }

  async openPath(path: string): Promise<void> {
    await this.page.goto(path);
  }

  private itemCard(name: string) {
    return this.testId('demo-item-card').filter({ hasText: name });
  }

  private receivedCard(name: string) {
    return this.testId('received-card').filter({ hasText: name });
  }

  private applicationCard(name: string) {
    return this.testId('application-card').filter({ hasText: name });
  }
}
