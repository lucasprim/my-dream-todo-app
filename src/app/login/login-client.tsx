"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/inbox";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Incorrect password.");
    } else {
      router.push(callbackUrl);
    }
    setLoading(false);
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/passkey/authenticate/options");
      if (!optionsRes.ok) throw new Error("No passkey registered");
      const options = await optionsRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/passkey/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      if (!verifyRes.ok) throw new Error("Passkey verification failed");
      const { token } = await verifyRes.json();
      const result = await signIn("credentials", {
        password: token,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) throw new Error("Sign-in failed");
      router.push(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="flex flex-col items-center gap-2">
          <CheckSquare className="h-8 w-8" />
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handlePasskeyLogin}
          disabled={loading}
        >
          Sign In with Passkey
        </Button>
      </div>
    </div>
  );
}
