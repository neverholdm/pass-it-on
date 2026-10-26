import { test } from '../../fixtures';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test('@regression @destructive impact counts completed hand-offs and resets to the sample', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.resetDemo();
  testData.remember(() => demo.resetDemo());

  await demo.gotoImpact();
  await demo.expectCompletedGiveaways('1');
  await demo.goToActivity();
  await demo.approve('Desk Lamp');
  await demo.switchTo('Applicant');
  await demo.goToActivity();
  await demo.confirmReceived('Desk Lamp');

  await demo.gotoImpact();
  await demo.expectCompletedGiveaways('2');
  await demo.resetDemo();
  await demo.gotoImpact();
  await demo.expectCompletedGiveaways('1');
});
