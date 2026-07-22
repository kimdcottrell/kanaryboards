import type { HandleOAuthCallbackParams, PendingSessionOptions, ShowWhenCondition } from '@clerk/shared/types';
import React from 'react';
import { type WithClerkProp } from './utils';
export declare const ClerkLoaded: ({ children }: React.PropsWithChildren) => JSX.Element | null;
export declare const ClerkLoading: ({ children }: React.PropsWithChildren) => JSX.Element | null;
export type ShowProps = React.PropsWithChildren<{
    fallback?: React.ReactNode;
    when: ShowWhenCondition;
} & PendingSessionOptions>;
export declare const Show: ({ children, fallback, treatPendingAsSignedOut, when }: ShowProps) => import("react/jsx-runtime").JSX.Element | null;
/**
 * Use `<AuthenticateWithRedirectCallback/>` to complete a custom OAuth flow.
 */
export declare const AuthenticateWithRedirectCallback: {
    (props: Omit<WithClerkProp<HandleOAuthCallbackParams>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
//# sourceMappingURL=controlComponents.d.ts.map