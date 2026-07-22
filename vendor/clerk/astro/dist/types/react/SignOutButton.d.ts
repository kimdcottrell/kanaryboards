import type { SignOutOptions } from '@clerk/shared/types';
import React from 'react';
import type { WithClerkProp } from './utils';
export type SignOutButtonProps = SignOutOptions & {
    children?: React.ReactNode;
};
export declare const SignOutButton: {
    (props: Omit<React.PropsWithChildren<WithClerkProp<SignOutButtonProps>>, "clerk">): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
//# sourceMappingURL=SignOutButton.d.ts.map