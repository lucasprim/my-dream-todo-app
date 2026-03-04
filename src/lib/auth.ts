import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const appPasswordHash = process.env.APP_PASSWORD;
        if (!appPasswordHash) {
          throw new Error("APP_PASSWORD environment variable is not set");
        }
        if (!credentials?.password) return null;

        const valid = await bcrypt.compare(credentials.password, appPasswordHash);
        if (valid) return { id: "1", name: "Owner" };
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
