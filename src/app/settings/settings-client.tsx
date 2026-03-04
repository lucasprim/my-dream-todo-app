"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { startRegistration } from "@simplewebauthn/browser";

export function SettingsClient() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const optionsRes = await fetch("/api/passkey/register/options");
      if (!optionsRes.ok) throw new Error(await optionsRes.text());
      const options = await optionsRes.json();
      const attResp = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());
      setStatus("Passkey registered successfully!");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Passkey</h2>
        <p className="text-sm text-muted-foreground">
          Register a passkey to sign in without a password.
        </p>
        <Button
          variant="outline"
          onClick={handleRegisterPasskey}
          disabled={loading}
        >
          {loading ? "Registering…" : "Register Passkey"}
        </Button>
        {status && (
          <p
            className={
              status.startsWith("Error")
                ? "text-sm text-destructive"
                : "text-sm text-green-600"
            }
          >
            {status}
          </p>
        )}
      </section>

      <section className="mt-10 space-y-4 border-t pt-8">
        <h2 className="text-lg font-semibold">Account</h2>
        <Button
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign Out
        </Button>
      </section>
    </div>
  );
}
