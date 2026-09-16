import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/shared/GitHubIcon";
import { GoogleIcon } from "@/components/shared/GoogleIcon";

// The GitHub/Google sign-in/sign-up buttons and the "or" divider always
// appear together above the credentials form on both /sign-in and /register.
export function OAuthButtons({
  githubAction,
  googleAction,
  githubLabel,
  googleLabel,
}: {
  githubAction: () => Promise<void>;
  googleAction: () => Promise<void>;
  githubLabel: string;
  googleLabel: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <form action={githubAction}>
          <Button type="submit" variant="outline" className="w-full rounded-[10px]">
            <GitHubIcon />
            {githubLabel}
          </Button>
        </form>

        <form action={googleAction}>
          <Button type="submit" variant="outline" className="w-full rounded-[10px]">
            <GoogleIcon />
            {googleLabel}
          </Button>
        </form>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
