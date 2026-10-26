import { test } from '../../fixtures';
import { PassItOnDemoPage } from '../../pages/PassItOnDemoPage';

test('@regression @destructive browse filters intersect and completed status remains visible', async ({ page, testData }) => {
  const demo = new PassItOnDemoPage(page);
  await demo.resetDemo();
  testData.remember(() => demo.resetDemo());
  await demo.switchTo('Applicant');
  await demo.openPath('/demo/browse');
  await demo.searchItems('  lamp  ');
  await demo.expectItemCount(1);
  await demo.selectCategory('Books');
  await demo.expectEmptyResults();

  await demo.clearFilters();
  await demo.expectItemCount(3);
  await demo.expectItemStatus('Oak Side Table', 'Completed');
});
