// TODO: Clerk Billing. has({ plan }) is always false for OAuth tokens, so this
// will need clerkClient.billing.getUserBillingSubscription(userId).
export function isPaidUser(_userId: string): Promise<boolean> {
  return Promise.resolve(true);
}
