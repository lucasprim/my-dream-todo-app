import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { currentChallenge } from "../options/route";
import { saveCredential } from "@/lib/passkey-store";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const rpID = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).hostname
    : "localhost";

  const origin = process.env.NEXTAUTH_URL ?? `http://localhost:3000`;

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: currentChallenge.value,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  saveCredential({
    id: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
  });

  return NextResponse.json({ verified: true });
}
