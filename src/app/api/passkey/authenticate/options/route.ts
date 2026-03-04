import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { loadCredential } from "@/lib/passkey-store";

// Store challenge in memory (single user, single server)
export const authChallenge = { value: "" };

export async function GET() {
  const stored = loadCredential();
  if (!stored) {
    return NextResponse.json({ error: "No passkey registered" }, { status: 404 });
  }

  const rpID = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).hostname
    : "localhost";

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [
      {
        id: stored.id,
        transports: stored.transports,
      },
    ],
    userVerification: "preferred",
  });

  authChallenge.value = options.challenge;

  return NextResponse.json(options);
}
