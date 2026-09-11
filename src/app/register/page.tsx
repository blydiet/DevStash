import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { signInWithGithub } from "@/actions/auth";
import { auth } from "@/auth";
import { HomeNav } from "@/components/homepage/HomeNav";
import { spaceGrotesk, jetbrainsMono } from "@/app/fonts/homepage-fonts";
import "@/app/homepage.css";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <div className={`homepage ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <HomeNav />
      </div>
      <div className="flex min-h-screen items-center justify-center p-6 pt-[calc(68px+1.5rem)]">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Store smarter. Build faster.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm githubAction={signInWithGithub.bind(null, "/dashboard")} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
