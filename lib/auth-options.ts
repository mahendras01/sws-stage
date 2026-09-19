import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, name, password_hash, status, is_admin, role, district")
          .eq("email", credentials.email.toLowerCase().trim())
          .single();

        if (error || !user) {
          throw new Error("Invalid email or password");
        }

        if (user.status === "pending") {
          throw new Error("Your account is pending admin approval");
        }

        if (user.status === "rejected") {
          throw new Error("Your account has been rejected");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: user.is_admin,
          role: user.role ?? "user",
          district: user.district,
          status: user.status,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.is_admin = user.is_admin;
        token.role = user.role ?? "user";
        token.district = user.district;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const userId = typeof token.id === "string" ? token.id : undefined;

        if (userId) {
          const { data: freshUser, error } = await supabase
            .from("users")
            .select("id, email, name, status, is_admin, role, district")
            .eq("id", userId)
            .single();

          if (!error && freshUser) {
            session.user.id = freshUser.id;
            session.user.is_admin = Boolean(freshUser.is_admin);
            session.user.role = freshUser.role ?? "user";
            session.user.district = freshUser.district ?? null;
            session.user.status = freshUser.status ?? "pending";
            session.user.name = freshUser.name ?? session.user.name;
            session.user.email = freshUser.email ?? session.user.email;
          } else {
            session.user.id = token.id;
            session.user.is_admin = Boolean(token.is_admin);
            session.user.role = (token.role as any) ?? "user";
            session.user.district = (token.district as string | null) ?? null;
            session.user.status = (token.status as any) ?? "pending";
          }
        } else {
          session.user.id = token.id;
          session.user.is_admin = Boolean(token.is_admin);
          session.user.role = (token.role as any) ?? "user";
          session.user.district = (token.district as string | null) ?? null;
          session.user.status = (token.status as any) ?? "pending";
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
