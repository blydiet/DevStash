import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  return session.user.id;
}

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

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  hasPassword: boolean;
  authProvider: "github" | "credentials";
}

export async function getProfileUser(): Promise<ProfileUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
      accounts: { select: { provider: true } },
    },
  });

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword: user.password !== null,
    authProvider: user.accounts.some((account) => account.provider === "github")
      ? "github"
      : "credentials",
  };
}
