import type { LoadedClerk } from '@clerk/shared/types';
import React from 'react';
export declare const withClerk: <P extends {
    clerk: LoadedClerk | undefined | null;
}>(Component: React.ComponentType<P>, displayName?: string) => {
    (props: Omit<P, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export type WithClerkProp<T = unknown> = T & {
    clerk: LoadedClerk | undefined | null;
};
export declare const assertSingleChild: (children: React.ReactNode) => (name: "SignInButton" | "SignUpButton" | "SignOutButton" | "SignInWithMetamaskButton" | "SubscriptionDetailsButton" | "CheckoutButton" | "PlanDetailsButton") => React.ReactNode;
export declare const normalizeWithDefaultValue: (children: React.ReactNode | undefined, defaultText: string) => number | true | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal;
export declare const safeExecute: (cb: unknown) => (...args: any) => any;
//# sourceMappingURL=utils.d.ts.map