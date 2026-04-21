import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Extiende el tipo Session para incluir rol y firstLogin
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstLogin: boolean;
      teamId: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
    firstLogin: boolean;
    teamId: string | null;
  }
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.toLowerCase().trim()))
          .limit(1);

        if (!user || !user.active) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id:         user.id,
          name:       user.name,
          email:      user.username,  // NextAuth requiere email, usamos username
          role:       user.role,
          firstLogin: user.firstLogin,
          teamId:     user.teamId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id         = user.id;
        token.role       = user.role;
        token.firstLogin = user.firstLogin;
        token.teamId     = user.teamId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id         = token.id as string;
      session.user.role       = token.role as string;
      session.user.firstLogin = token.firstLogin as boolean;
      session.user.teamId     = token.teamId as string | null;
      return session;
    },
  },
});
