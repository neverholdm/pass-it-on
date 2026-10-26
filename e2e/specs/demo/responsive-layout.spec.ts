import { test } from '../../fixtures';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test('@regression @destructive core demo pages fit narrow, tablet, and desktop viewports', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.resetDemo();
  testData.remember(() => demo.resetDemo());
  await demo.switchTo('Applicant');

  await demo.openPath('/demo/browse');
  const itemDetailsPath = await demo.itemDetailsPath('Desk Lamp');
  const paths = ['/demo/browse', '/demo/give', itemDetailsPath, '/demo/activity', '/demo/impact'];
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await demo.openPath(path);
      await demo.assertNoHorizontalOverflow();
    }
  }
  await demo.expectHeading('Small things add up');
});
