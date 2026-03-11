import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { loadCredential, saveCredential } from "@/lib/passkey-store";
import { authChallenge } from "../options/route";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

export async function POST(req: NextRequest) {
  const stored = loadCredential();
  if (!stored) {
    return NextResponse.json({ error: "No passkey registered" }, { status: 404 });
  }

  const body = await req.json();
  const rpID = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).hostname
    : "localhost";
  const origin = process.env.NEXTAUTH_URL ?? `http://localhost:3000`;

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: authChallenge.value,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: stored.id,
      publicKey: isoBase64URL.toBuffer(stored.publicKey),
      counter: stored.counter,
      transports: stored.transports,
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  // Update counter
  saveCredential({ ...stored, counter: verification.authenticationInfo.newCounter });

  // Return a one-time token = APP_PASSWORD so the client can complete signIn
  return NextResponse.json({ token: process.env.APP_PASSWORD ?? "" });
}
