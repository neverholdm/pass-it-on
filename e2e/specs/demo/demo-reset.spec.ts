import { test } from '../../fixtures';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test('@regression @destructive cancel preserves the sample and confirmed reset is repeatable', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.openAs('Giver');
  await demo.cancelReset();
  await demo.expectText('Blue Ceramic Vase');
  testData.remember(() => demo.resetDemo());

  await demo.resetDemo();
  await demo.resetDemo();
  await demo.openPath('/demo/browse');
  await demo.expectItemCount(3);
});
