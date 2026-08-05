import { auth } from "@/auth";

export interface CurrentUser {
  name: string;
  email: string;
  image: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  return {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };
}
