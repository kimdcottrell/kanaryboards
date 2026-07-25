import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/astro/react";
import type { SignInButtonProps } from "@clerk/astro/react";
import { useEffect, useState } from "react";
import { getClerkAppearance } from "@components/theme/clerkAppearance.ts";
import { getPreferredTheme } from "@components/theme/theme.ts";

export default function LoginControls() {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    const onThemeChange = (event: Event) =>
      setTheme((event as CustomEvent<string>).detail);

    addEventListener("theme-change", onThemeChange);
    return () => removeEventListener("theme-change", onThemeChange);
  }, []);

  const appearance = getClerkAppearance(theme);

  // `SignInButtonProps` is a `mode: "modal" | "redirect"` union whose
  // `appearance` field only exists on the modal branch. `Omit<..., "clerk">`
  // in the component's declared prop type collapses `keyof` across that
  // union down to the shared keys, which makes TS see `appearance` as
  // missing even though it's valid for `mode="modal"` — hence the cast.
  const signInButtonProps = { mode: "modal", appearance } as SignInButtonProps;

  return (
    <>
      <ClerkLoading>
        <div className="skeleton h-7 w-7" />
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-out">
          <SignInButton {...signInButtonProps}>
            <button type="button" className="btn btn-warning">
              <span className="iconify basil--login-solid text-xl" />
              Sign In
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton key={theme} appearance={appearance} />
        </Show>
      </ClerkLoaded>
    </>
  );
}
