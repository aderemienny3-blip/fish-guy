import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/auth";
import { login } from "../actions";
import { Banner, btn, input, label } from "@/components/admin/ui";

const MESSAGES: Record<string, string> = {
  invalid: "Wrong email or password.",
  locked: "Too many wrong attempts. Try again in 15 minutes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">Staff only</p>
      <h1 className="mt-2 font-serif text-4xl">FISH GUY</h1>
      <p className="mb-8 mt-1 text-sm text-[#9A9585]">Sign in to the admin dashboard.</p>

      {error && <Banner>{MESSAGES[error] ?? "Could not sign in."}</Banner>}

      <form action={login} className="space-y-4">
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="username" className={input} />
        </div>
        <div>
          <label htmlFor="password" className={label}>Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
        </div>
        <button type="submit" className={`${btn} w-full`}>Sign in</button>
      </form>
    </main>
  );
}
