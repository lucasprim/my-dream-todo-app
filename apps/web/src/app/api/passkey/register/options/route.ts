import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateRegistrationOptions,
} from "@simplewebauthn/server";

// Store challenge in memory (single user, single server)
export const currentChallenge = { value: "" };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rpID = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).hostname
    : "localhost";

  const options = await generateRegistrationOptions({
    rpName: "My Tasks",
    rpID,
    userName: "owner",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  currentChallenge.value = options.challenge;

  return NextResponse.json(options);
}
