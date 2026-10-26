import { authAPI } from '@/services/custom/auth';
import {
  demoActivityRetrieve,
  demoBookingAction,
  demoCommentCreate,
  demoIdentitySwitch,
  demoImpactRetrieve,
  demoItemApply,
  demoItemCreate,
  demoItemDelete,
  demoItemRetrieve,
  demoItemsList,
  demoResetCreate,
} from '@/services/django';
import type {
  DemoActivity as SdkDemoActivity,
  DemoBooking as SdkDemoBooking,
  DemoComment as SdkDemoComment,
  DemoIdentityResponse as SdkDemoIdentityResponse,
  DemoImpact as SdkDemoImpact,
  DemoItem as SdkDemoItem,
  DemoItemCreate,
  DemoItemDetails as SdkDemoItemDetails,
} from '@/services/django';

export type DemoItem = SdkDemoItem;
export type DemoComment = SdkDemoComment;
export type DemoItemDetails = SdkDemoItemDetails;
export type DemoBooking = SdkDemoBooking;
export type DemoActivity = SdkDemoActivity;
export type DemoImpact = SdkDemoImpact;
export type DemoIdentityResponse = SdkDemoIdentityResponse;

async function primeCsrf(): Promise<void> {
  await authAPI.fetchCSRFToken();
}

export const passItOnDemoAPI = {
  switchIdentity: async (identity: 'giver' | 'applicant') => {
    await primeCsrf();
    return (await demoIdentitySwitch({ body: { identity } })).data;
  },
  listItems: (search = '', category = '') =>
    demoItemsList({
      query: { search: search.trim() || undefined, category: category || undefined },
    }).then(({ data }) => data),
  getItem: (itemId: string) =>
    demoItemRetrieve({ path: { item_id: itemId } }).then(({ data }) => data),
  createItem: async (input: DemoItemCreate) => {
    await primeCsrf();
    return (await demoItemCreate({ body: input })).data;
  },
  deleteItem: async (itemId: string) => {
    await primeCsrf();
    await demoItemDelete({ path: { item_id: itemId } });
  },
  apply: async (itemId: string) => {
    await primeCsrf();
    return (await demoItemApply({ path: { item_id: itemId } })).data;
  },
  comment: async (itemId: string, body: string) => {
    await primeCsrf();
    return (await demoCommentCreate({ body: { item: itemId, body } })).data;
  },
  activity: () => demoActivityRetrieve().then(({ data }) => data),
  action: async (bookingId: string, action: string) => {
    await primeCsrf();
    return demoBookingAction({
      path: { booking_id: bookingId, action },
    }).then(({ data }) => data);
  },
  impact: () => demoImpactRetrieve().then(({ data }) => data),
  reset: async () => {
    await primeCsrf();
    return (await demoResetCreate()).data;
  },
};
