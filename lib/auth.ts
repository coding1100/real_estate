import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const ONE_HOUR_IN_SECONDS = 60 * 60;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: ONE_HOUR_IN_SECONDS,
  },
  jwt: {
    maxAge: ONE_HOUR_IN_SECONDS,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (user) {
        token.id = (user as any).id;
        (token as any).issuedAt = nowInSeconds;
      } else if (!(token as any).issuedAt) {
        (token as any).issuedAt = nowInSeconds;
      }

      const issuedAt = (token as any).issuedAt as number;
      if (issuedAt && nowInSeconds - issuedAt > ONE_HOUR_IN_SECONDS) {
        (token as any).expired = true;
      }

      return token;
    },
    async session({ session, token }) {
      if ((token as any).expired) {
        return null;
      }

      if (session.user && (token as any).id) {
        (session.user as any).id = (token as any).id;
      }

      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

