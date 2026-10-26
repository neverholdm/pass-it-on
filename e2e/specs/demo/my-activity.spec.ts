import { test } from '../../fixtures';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test('@regression @destructive activity is identity-scoped and cancelling approval reopens the item', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.resetDemo();
  testData.remember(() => demo.resetDemo());

  await demo.switchTo('Applicant');
  await demo.goToActivity();
  await demo.expectGiverItemCount(0);
  await demo.expectApplicationCount(2);
  await demo.expectApplicationStatus('Desk Lamp', 'Pending');
  await demo.cancelApplication('Desk Lamp');
  await demo.openPath('/demo/browse');
  await demo.expectItemStatus('Desk Lamp', 'Available');

  await demo.searchAndOpen('Desk Lamp');
  await demo.applyForItem();

  await demo.switchTo('Giver');
  await demo.goToActivity();
  await demo.expectGiverItemCount(3);
  await demo.expectReceivedCount(3);
  await demo.decline('Desk Lamp');

  await demo.switchTo('Applicant');
  await demo.searchAndOpen('Desk Lamp');
  await demo.applyForItem();

  await demo.switchTo('Giver');
  await demo.goToActivity();
  await demo.approve('Desk Lamp');

  await demo.switchTo('Applicant');
  await demo.goToActivity();
  await demo.cancelApplication('Desk Lamp');
  await demo.openPath('/demo/browse');
  await demo.expectItemStatus('Desk Lamp', 'Available');
});
