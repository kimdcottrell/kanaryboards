import React from "react";
import { UNSAFE_PortalProvider } from "@clerk/shared/react";
import { GoogleOneTapProps, HandleOAuthCallbackParams, LoadedClerk, OAuthConsentProps, OrganizationListProps, OrganizationProfileProps, OrganizationSwitcherProps, PendingSessionOptions, PricingTableProps, ShowWhenCondition, SignInButtonProps, SignInProps, SignOutOptions, SignUpButtonProps, SignUpProps, UseAuthReturn, UserButtonProps, UserProfileProps, WaitlistProps, __experimental_CheckoutButtonProps, __experimental_PlanDetailsButtonProps, __experimental_SubscriptionDetailsButtonProps } from "@clerk/shared/types";

//#region src/react/utils.d.ts
type WithClerkProp<T = unknown> = T & {
  clerk: LoadedClerk | undefined | null;
};
//#endregion
//#region src/react/CheckoutButton.d.ts
declare const CheckoutButton: {
  (props: Omit<WithClerkProp<React.PropsWithChildren<__experimental_CheckoutButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/PlanDetailsButton.d.ts
declare const PlanDetailsButton: {
  (props: Omit<WithClerkProp<React.PropsWithChildren<__experimental_PlanDetailsButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/SignInButton.d.ts
declare const SignInButton: {
  (props: Omit<WithClerkProp<React.PropsWithChildren<SignInButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/SignOutButton.d.ts
type SignOutButtonProps = SignOutOptions & {
  children?: React.ReactNode;
};
declare const SignOutButton: {
  (props: Omit<React.PropsWithChildren<WithClerkProp<SignOutButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/SignUpButton.d.ts
declare const SignUpButton: {
  (props: Omit<WithClerkProp<React.PropsWithChildren<SignUpButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/SubscriptionDetailsButton.d.ts
declare const SubscriptionDetailsButton: {
  (props: Omit<WithClerkProp<React.PropsWithChildren<__experimental_SubscriptionDetailsButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/uiComponents.d.ts
interface OpenProps {
  open: ((props: any) => void) | undefined;
  close: (() => void) | undefined;
  props?: any;
}
interface MountProps {
  mount: ((node: HTMLDivElement, props: any) => void) | undefined;
  unmount: ((node: HTMLDivElement) => void) | undefined;
  updateProps?: (props: any) => void;
  props?: any;
}
declare const SignIn: {
  (props: Omit<WithClerkProp<SignInProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const SignUp: {
  (props: Omit<WithClerkProp<SignUpProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const UserButton: {
  (props: Omit<WithClerkProp<UserButtonProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const UserProfile: {
  (props: Omit<WithClerkProp<UserProfileProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const OrganizationProfile: {
  (props: Omit<WithClerkProp<OrganizationProfileProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const OrganizationSwitcher: {
  (props: Omit<WithClerkProp<OrganizationSwitcherProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const OrganizationList: {
  (props: Omit<WithClerkProp<OrganizationListProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const GoogleOneTap: {
  (props: Omit<WithClerkProp<GoogleOneTapProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const Waitlist: {
  (props: Omit<WithClerkProp<WaitlistProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const PricingTable: {
  (props: Omit<WithClerkProp<PricingTableProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
declare const OAuthConsent: {
  (props: Omit<WithClerkProp<OAuthConsentProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/controlComponents.d.ts
declare const ClerkLoaded: ({
  children
}: React.PropsWithChildren) => JSX.Element | null;
declare const ClerkLoading: ({
  children
}: React.PropsWithChildren) => JSX.Element | null;
type ShowProps = React.PropsWithChildren<{
  fallback?: React.ReactNode;
  when: ShowWhenCondition;
} & PendingSessionOptions>;
declare const Show: ({
  children,
  fallback,
  treatPendingAsSignedOut,
  when
}: ShowProps) => import("react/jsx-runtime").JSX.Element | null;
/**
 * Use `<AuthenticateWithRedirectCallback/>` to complete a custom OAuth flow.
 */
declare const AuthenticateWithRedirectCallback: {
  (props: Omit<WithClerkProp<HandleOAuthCallbackParams>, "clerk">): import("react/jsx-runtime").JSX.Element;
  displayName: string;
};
//#endregion
//#region src/react/hooks.d.ts
type UseAuth = (options?: PendingSessionOptions) => UseAuthReturn;
/**
 * Returns the current auth state, the user and session ids and the `getToken`
 * that can be used to retrieve the given template or the default Clerk token.
 *
 * Until Clerk loads, `isLoaded` will be set to `false`.
 * Once Clerk loads, `isLoaded` will be set to `true`, and you can
 * safely access the `userId` and `sessionId` variables.
 *
 * For projects using a server, you can have immediate access to this data during SSR.
 *
 * @example
 * function Hello() {
 *   const { isSignedIn, sessionId, userId } = useAuth();
 *   if(isSignedIn) {
 *     return null;
 *   }
 *   console.log(sessionId, userId)
 *   return <div>...</div>
 * }
 *
 * This page will be fully rendered during SSR:
 * @example
 * export HelloPage = () => {
 *   const { isSignedIn, sessionId, userId } = useAuth();
 *   console.log(isSignedIn, sessionId, userId)
 *   return <div>...</div>
 * }
 */
declare const useAuth: UseAuth;
//#endregion
export { AuthenticateWithRedirectCallback, ClerkLoaded, ClerkLoading, GoogleOneTap, MountProps, OAuthConsent, OpenProps, OrganizationList, OrganizationProfile, OrganizationSwitcher, PricingTable, Show, ShowProps, SignIn, SignInButton, type SignInButtonProps, SignOutButton, type SignOutButtonProps, SignUp, SignUpButton, type SignUpButtonProps, UNSAFE_PortalProvider, UserButton, UserProfile, Waitlist, CheckoutButton as __experimental_CheckoutButton, type __experimental_CheckoutButtonProps, PlanDetailsButton as __experimental_PlanDetailsButton, type __experimental_PlanDetailsButtonProps, SubscriptionDetailsButton as __experimental_SubscriptionDetailsButton, type __experimental_SubscriptionDetailsButtonProps, useAuth };
//# sourceMappingURL=index.d.ts.map