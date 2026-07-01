import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/astro/react";

export default function LoginControls() {
  return (
    <>
      <ClerkLoading>
        <div className="skeleton h-7 w-7" />
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button type="button" className="btn btn-warning">
              <span className="iconify basil--login-solid text-xl" />
              Sign In
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </ClerkLoaded>
    </>
  );
}
