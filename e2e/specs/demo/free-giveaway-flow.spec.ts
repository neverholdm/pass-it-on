import { test } from '../../fixtures';
import { namespaced } from '../../support/namespace';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test.describe.configure({ mode: 'serial' });

test('@regression @destructive two demo sessions complete and retain one free hand-off', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.resetDemo();
  testData.remember(() => demo.resetDemo());

  for (let round = 1; round <= 3; round += 1) {
    await demo.resetDemo();
    const name = namespaced(`Reading Lamp Round ${round}`);
    await demo.giveItem(name, 'Electronics', 'A fictional lamp for the browser acceptance flow.');

    await demo.switchTo('Applicant');
    await demo.searchAndOpen(name);
    await demo.postMessage('Could I pick this up after work?');
    await demo.applyForItem();

    await demo.switchTo('Giver');
    await demo.goToActivity();
    await demo.approve(name);
    await demo.switchTo('Applicant');
    await demo.goToActivity();
    await demo.confirmReceived(name);
    await demo.reload();
    await demo.expectApplicationStatus(name, 'Completed');
    await demo.repeatCompletion(name);

    await demo.gotoImpact();
    await demo.expectCompletedGiveaways('2');
  }
});
