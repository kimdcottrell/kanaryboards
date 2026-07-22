import { f as $clerk, p as $csrState, t as $authStore } from "../external-DHTxQaok.js";
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { computed } from "nanostores";
import { Fragment, jsx } from "react/jsx-runtime";
import { createCheckAuthorization, resolveAuthState } from "@clerk/shared/authorization";
import { deriveState } from "@clerk/shared/deriveState";
import { authAsyncStorage } from "#async-local-storage";
import { UNSAFE_PortalProvider } from "@clerk/shared/react";

//#region src/react/utils.tsx
/**
* This implementation of `useStore` is an alternative solution to the hook exported by nanostores
* Reference: https://github.com/nanostores/react/blob/main/index.js
*/
function useStore$1(store) {
	const get = store.get.bind(store);
	return React.useSyncExternalStore(store.listen, get, get);
}
const withClerk = (Component, displayName) => {
	displayName = displayName || Component.displayName || Component.name || "Component";
	Component.displayName = displayName;
	const HOC = (props) => {
		const clerk = useStore$1(computed([$csrState, $clerk], (state, clerk) => {
			return state.isLoaded ? clerk : null;
		}));
		return /* @__PURE__ */ jsx(Component, {
			...props,
			clerk
		}, clerk ? "a" : "b");
	};
	HOC.displayName = `withClerk(${displayName})`;
	return HOC;
};
const assertSingleChild = (children) => (name) => {
	try {
		return React.Children.only(children);
	} catch {
		const childArray = React.Children.toArray(children);
		if (childArray.length === 1 && React.isValidElement(childArray[0])) return childArray[0];
		return `You've passed multiple children components to <${name}/>. You can only pass a single child component or text.`;
	}
};
const normalizeWithDefaultValue = (children, defaultText) => {
	if (!children) children = defaultText;
	if (typeof children === "string") children = /* @__PURE__ */ jsx("button", {
		type: "button",
		children
	});
	return children;
};
const safeExecute = (cb) => (...args) => {
	if (cb && typeof cb === "function") return cb(...args);
};

//#endregion
//#region src/react/CheckoutButton.tsx
const CheckoutButton = withClerk(({ clerk, children, ...props }) => {
	const { planId, planPeriod, for: _for, onSubscriptionComplete, newSubscriptionRedirectUrl, checkoutProps, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Checkout");
	const child = assertSingleChild(children)("CheckoutButton");
	const clickHandler = () => {
		if (!clerk) return;
		return clerk.__internal_openCheckout({
			planId,
			planPeriod,
			for: _for,
			onSubscriptionComplete,
			newSubscriptionRedirectUrl,
			...checkoutProps
		});
	};
	const wrappedChildClickHandler = (e) => {
		if (child && typeof child === "object" && "props" in child) safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "CheckoutButton");

//#endregion
//#region src/react/PlanDetailsButton.tsx
const PlanDetailsButton = withClerk(({ clerk, children, ...props }) => {
	const { plan, planId, initialPlanPeriod, planDetailsProps, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Plan details");
	const child = assertSingleChild(children)("PlanDetailsButton");
	const clickHandler = () => {
		if (!clerk) return;
		return clerk.__internal_openPlanDetails({
			plan,
			planId,
			initialPlanPeriod,
			...planDetailsProps
		});
	};
	const wrappedChildClickHandler = (e) => {
		if (child && typeof child === "object" && "props" in child) safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "PlanDetailsButton");

//#endregion
//#region src/react/SignInButton.tsx
const SignInButton = withClerk(({ clerk, children, ...props }) => {
	const { signUpFallbackRedirectUrl, forceRedirectUrl, fallbackRedirectUrl, signUpForceRedirectUrl, mode, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Sign in");
	const child = assertSingleChild(children)("SignInButton");
	const clickHandler = () => {
		const opts = {
			forceRedirectUrl,
			fallbackRedirectUrl,
			signUpFallbackRedirectUrl,
			signUpForceRedirectUrl
		};
		if (!clerk) return;
		if (mode === "modal") return clerk.openSignIn({
			...opts,
			appearance: props.appearance
		});
		return clerk.redirectToSignIn({
			...opts,
			signInFallbackRedirectUrl: fallbackRedirectUrl,
			signInForceRedirectUrl: forceRedirectUrl
		});
	};
	const wrappedChildClickHandler = async (e) => {
		if (child && typeof child === "object" && "props" in child) await safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "SignInButton");

//#endregion
//#region src/react/SignOutButton.tsx
const SignOutButton = withClerk(({ clerk, children, ...props }) => {
	const { redirectUrl = "/", sessionId, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Sign out");
	const child = assertSingleChild(children)("SignOutButton");
	const clickHandler = () => clerk?.signOut({
		redirectUrl,
		sessionId
	});
	const wrappedChildClickHandler = async (e) => {
		if (child && typeof child === "object" && "props" in child) await safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "SignOutButton");

//#endregion
//#region src/react/SignUpButton.tsx
const SignUpButton = withClerk(({ clerk, children, ...props }) => {
	const { fallbackRedirectUrl, forceRedirectUrl, signInFallbackRedirectUrl, signInForceRedirectUrl, mode, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Sign up");
	const child = assertSingleChild(children)("SignUpButton");
	const clickHandler = () => {
		const opts = {
			fallbackRedirectUrl,
			forceRedirectUrl,
			signInFallbackRedirectUrl,
			signInForceRedirectUrl
		};
		if (!clerk) return;
		if (mode === "modal") return clerk.openSignUp({
			...opts,
			appearance: props.appearance,
			unsafeMetadata: props.unsafeMetadata
		});
		return clerk.redirectToSignUp({
			...opts,
			signUpFallbackRedirectUrl: fallbackRedirectUrl,
			signUpForceRedirectUrl: forceRedirectUrl
		});
	};
	const wrappedChildClickHandler = async (e) => {
		if (child && typeof child === "object" && "props" in child) await safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "SignUpButton");

//#endregion
//#region src/react/SubscriptionDetailsButton.tsx
const SubscriptionDetailsButton = withClerk(({ clerk, children, ...props }) => {
	const { for: _for, subscriptionDetailsProps, onSubscriptionCancel, ...rest } = props;
	children = normalizeWithDefaultValue(children, "Subscription details");
	const child = assertSingleChild(children)("SubscriptionDetailsButton");
	const clickHandler = () => {
		if (!clerk) return;
		return clerk.__internal_openSubscriptionDetails({
			for: _for,
			onSubscriptionCancel,
			...subscriptionDetailsProps
		});
	};
	const wrappedChildClickHandler = (e) => {
		if (child && typeof child === "object" && "props" in child) safeExecute(child.props.onClick)(e);
		return clickHandler();
	};
	const childProps = {
		...rest,
		onClick: wrappedChildClickHandler
	};
	return React.cloneElement(child, childProps);
}, "SubscriptionDetailsButton");

//#endregion
//#region src/react/uiComponents.tsx
const isMountProps = (props) => {
	return "mount" in props;
};
const isOpenProps = (props) => {
	return "open" in props;
};
var Portal = class extends React.PureComponent {
	portalRef = React.createRef();
	componentDidUpdate(prevProps) {
		if (!isMountProps(prevProps) || !isMountProps(this.props)) return;
		if (prevProps.props.appearance !== this.props.props.appearance || prevProps.props?.customPages?.length !== this.props.props?.customPages?.length) this.props.updateProps?.({
			node: this.portalRef.current,
			props: this.props.props
		});
	}
	componentDidMount() {
		if (this.portalRef.current) {
			if (isMountProps(this.props)) this.props.mount?.(this.portalRef.current, this.props.props);
			if (isOpenProps(this.props)) this.props.open?.(this.props.props);
		}
	}
	componentWillUnmount() {
		if (this.portalRef.current) {
			if (isMountProps(this.props)) this.props.unmount?.(this.portalRef.current);
			if (isOpenProps(this.props)) this.props.close?.();
		}
	}
	render() {
		return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { ref: this.portalRef }) });
	}
};
const SignIn = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountSignIn,
		unmount: clerk?.unmountSignIn,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "SignIn");
const SignUp = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountSignUp,
		unmount: clerk?.unmountSignUp,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "SignUp");
const UserButton = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountUserButton,
		unmount: clerk?.unmountUserButton,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "UserButton");
const UserProfile = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountUserProfile,
		unmount: clerk?.unmountUserProfile,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "UserProfile");
const OrganizationProfile = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountOrganizationProfile,
		unmount: clerk?.unmountOrganizationProfile,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "OrganizationProfile");
const OrganizationSwitcher = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountOrganizationSwitcher,
		unmount: clerk?.unmountOrganizationSwitcher,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "OrganizationSwitcher");
const OrganizationList = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountOrganizationList,
		unmount: clerk?.unmountOrganizationList,
		updateProps: clerk?.__internal_updateProps,
		props
	});
}, "OrganizationList");
const GoogleOneTap = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		open: clerk?.openGoogleOneTap,
		close: clerk?.closeGoogleOneTap,
		props
	});
}, "GoogleOneTap");
const Waitlist = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountWaitlist,
		unmount: clerk?.unmountWaitlist,
		props
	});
}, "Waitlist");
const PricingTable = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountPricingTable,
		unmount: clerk?.unmountPricingTable,
		props
	});
}, "PricingTable");
const OAuthConsent = withClerk(({ clerk, ...props }) => {
	return /* @__PURE__ */ jsx(Portal, {
		mount: clerk?.mountOAuthConsent,
		unmount: clerk?.unmountOAuthConsent,
		props
	});
}, "OAuthConsent");

//#endregion
//#region src/react/hooks.ts
/**
* @internal
*/
const clerkLoaded = () => {
	return new Promise((resolve) => {
		$csrState.subscribe(({ isLoaded }) => {
			if (isLoaded) resolve($clerk.get());
		});
	});
};
/**
* @internal
*/
const createGetToken = () => {
	return async (options) => {
		const clerk = await clerkLoaded();
		if (!clerk.session) return null;
		return clerk.session.getToken(options);
	};
};
/**
* @internal
*/
const createSignOut = () => {
	return async (...args) => {
		return (await clerkLoaded()).signOut(...args);
	};
};
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
const useAuth = ({ treatPendingAsSignedOut } = {}) => {
	const authContext = useAuthStore();
	const getToken = useCallback(createGetToken(), []);
	const signOut = useCallback(createSignOut(), []);
	const { userId, orgId, orgRole, orgPermissions, factorVerificationAge, sessionClaims } = authContext;
	const has = useCallback((params) => {
		return createCheckAuthorization({
			userId,
			orgId,
			orgRole,
			orgPermissions,
			factorVerificationAge,
			features: sessionClaims?.fea || "",
			plans: sessionClaims?.pla || ""
		})(params);
	}, [
		userId,
		orgId,
		orgRole,
		orgPermissions,
		factorVerificationAge,
		sessionClaims
	]);
	const payload = resolveAuthState({
		authObject: {
			...authContext,
			getToken,
			signOut,
			has
		},
		options: { treatPendingAsSignedOut }
	});
	if (!payload) throw new Error("Invalid state. Feel free to submit a bug or reach out to support");
	return payload;
};
function useStore(store, getServerSnapshot) {
	const get = store.get.bind(store);
	return useSyncExternalStore(store.listen, get, getServerSnapshot || get);
}
/**
* This implementation of `useStore` is an alternative solution to the hook exported by nanostores
* Reference: https://github.com/nanostores/react/blob/main/index.js
*/
function useAuthStore() {
	const get = $authStore.get.bind($authStore);
	return useStore($authStore, () => {
		/**
		* optional getServerSnapshot:
		* A function that returns the initial snapshot of the data in the store.
		* It will be used only during server rendering and during hydration of server-rendered content on the client.
		* The server snapshot must be the same between the client and the server, and is usually serialized and passed from the server to the client.
		* If you omit this argument, rendering the component on the server will throw an error.
		*/
		/**
		* When this runs on the server we want to grab the content from the async-local-storage.
		*/
		if (typeof window === "undefined") return deriveState(false, {
			user: null,
			session: null,
			client: null,
			organization: null
		}, authAsyncStorage.getStore());
		/**
		* When this runs on the client, during hydration, we want to grab the content the store.
		*/
		return get();
	});
}

//#endregion
//#region src/react/controlComponents.tsx
const $isLoadingClerkStore = computed($csrState, (state) => state.isLoaded);
const useSafeIsLoaded = () => {
	const [isLoaded, setIsLoaded] = useState(false);
	useEffect(() => {
		const unsub = $isLoadingClerkStore.subscribe(() => {
			setIsLoaded(true);
		});
		return () => unsub();
	}, []);
	return isLoaded;
};
const ClerkLoaded = ({ children }) => {
	if (!useSafeIsLoaded()) return null;
	return /* @__PURE__ */ jsx(Fragment, { children });
};
const ClerkLoading = ({ children }) => {
	if (useSafeIsLoaded()) return null;
	return /* @__PURE__ */ jsx(Fragment, { children });
};
const Show = ({ children, fallback, treatPendingAsSignedOut, when }) => {
	if (typeof when === "undefined") throw new Error("@clerk/astro: <Show /> requires a `when` prop.");
	const { has, isLoaded, userId } = useAuth({ treatPendingAsSignedOut });
	if (!isLoaded) return null;
	const authorized = /* @__PURE__ */ jsx(Fragment, { children });
	const unauthorized = /* @__PURE__ */ jsx(Fragment, { children: fallback ?? null });
	if (when === "signed-out") return userId ? unauthorized : authorized;
	if (!userId) return unauthorized;
	if (when === "signed-in") return authorized;
	if (typeof when === "function") return when(has) ? authorized : unauthorized;
	return has(when) ? authorized : unauthorized;
};
/**
* Use `<AuthenticateWithRedirectCallback/>` to complete a custom OAuth flow.
*/
const AuthenticateWithRedirectCallback = withClerk(({ clerk, ...handleRedirectCallbackParams }) => {
	useEffect(() => {
		clerk?.handleRedirectCallback(handleRedirectCallbackParams);
	}, []);
	return null;
}, "AuthenticateWithRedirectCallback");

//#endregion
export { AuthenticateWithRedirectCallback, ClerkLoaded, ClerkLoading, GoogleOneTap, OAuthConsent, OrganizationList, OrganizationProfile, OrganizationSwitcher, PricingTable, Show, SignIn, SignInButton, SignOutButton, SignUp, SignUpButton, UNSAFE_PortalProvider, UserButton, UserProfile, Waitlist, CheckoutButton as __experimental_CheckoutButton, PlanDetailsButton as __experimental_PlanDetailsButton, SubscriptionDetailsButton as __experimental_SubscriptionDetailsButton, useAuth };
//# sourceMappingURL=index.js.map