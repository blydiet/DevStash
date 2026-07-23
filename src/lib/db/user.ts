import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@devstash.io";

export interface CurrentUser {
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: DEMO_EMAIL },
    select: { name: true, email: true },
  });

  return { name: user.name ?? user.email, email: user.email };
}
