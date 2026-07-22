import type { GoogleOneTapProps, OAuthConsentProps, OrganizationListProps, OrganizationProfileProps, OrganizationSwitcherProps, PricingTableProps, SignInProps, SignUpProps, UserButtonProps, UserProfileProps, WaitlistProps } from '@clerk/shared/types';
import { type WithClerkProp } from './utils';
export interface OpenProps {
    open: ((props: any) => void) | undefined;
    close: (() => void) | undefined;
    props?: any;
}
export interface MountProps {
    mount: ((node: HTMLDivElement, props: any) => void) | undefined;
    unmount: ((node: HTMLDivElement) => void) | undefined;
    updateProps?: (props: any) => void;
    props?: any;
}
export declare const SignIn: {
    (props: Omit<WithClerkProp<SignInProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const SignUp: {
    (props: Omit<WithClerkProp<SignUpProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const UserButton: {
    (props: Omit<WithClerkProp<UserButtonProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const UserProfile: {
    (props: Omit<WithClerkProp<UserProfileProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const OrganizationProfile: {
    (props: Omit<WithClerkProp<OrganizationProfileProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const OrganizationSwitcher: {
    (props: Omit<WithClerkProp<OrganizationSwitcherProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const OrganizationList: {
    (props: Omit<WithClerkProp<OrganizationListProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const GoogleOneTap: {
    (props: Omit<WithClerkProp<GoogleOneTapProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const Waitlist: {
    (props: Omit<WithClerkProp<WaitlistProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const PricingTable: {
    (props: Omit<WithClerkProp<PricingTableProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export declare const OAuthConsent: {
    (props: Omit<WithClerkProp<OAuthConsentProps>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
//# sourceMappingURL=uiComponents.d.ts.map