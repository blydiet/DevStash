import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/shared/GitHubIcon";

// The GitHub sign-in/sign-up button and the "or" divider always appear
// together above the credentials form on both /sign-in and /register.
export function GitHubAuthButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  return (
    <>
      <form action={action}>
        <Button type="submit" variant="outline" className="w-full rounded-[10px]">
          <GitHubIcon />
          {label}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
