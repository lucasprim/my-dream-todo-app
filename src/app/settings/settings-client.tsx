"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startRegistration } from "@simplewebauthn/browser";
import {
  generateTokenAction,
  regenerateTokenAction,
} from "@/app/actions/token-actions";
import { Copy, Check, RefreshCw, Key } from "lucide-react";

export function SettingsClient({
  hasExistingToken,
}: {
  hasExistingToken: boolean;
}) {
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
      setStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
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
          {loading ? "Registering..." : "Register Passkey"}
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
        <h2 className="text-lg font-semibold">API Token</h2>
        <p className="text-sm text-muted-foreground">
          Generate a token for external integrations (e.g. calendar sync). The
          token is shown once — copy it before closing.
        </p>
        <ApiTokenManager hasExistingToken={hasExistingToken} />
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

function ApiTokenManager({
  hasExistingToken,
}: {
  hasExistingToken: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(hasExistingToken);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const plaintext = await generateTokenAction();
      setToken(plaintext);
      setHasToken(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    setLoading(true);
    setConfirmRegenerate(false);
    try {
      const plaintext = await regenerateTokenAction();
      setToken(plaintext);
      setCopied(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasToken) {
    return (
      <Button onClick={handleGenerate} disabled={loading} variant="outline">
        <Key className="h-4 w-4 mr-2" />
        {loading ? "Generating..." : "Generate API Token"}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {token ? (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={token}
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Token configured. The value is hidden for security.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={confirmRegenerate ? "destructive" : "outline"}
          size="sm"
          onClick={handleRegenerate}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {loading
            ? "Regenerating..."
            : confirmRegenerate
              ? "Confirm — old token will stop working"
              : "Regenerate Token"}
        </Button>
        {confirmRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmRegenerate(false)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
