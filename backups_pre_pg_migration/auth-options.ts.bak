import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { log, newRequestId, summarizeUser } from "./logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const requestId = newRequestId();
        const attemptedEmail = credentials?.email?.toLowerCase().trim();
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0].trim();

        if (!credentials?.email || !credentials?.password) {
          log.warn("auth.login.failed", { requestId, ip, reason: "missing_credentials", email: attemptedEmail });
          throw new Error("Email and password are required");
        }

        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, name, password_hash, status, is_admin, role, district, phone_number, ehrms_code")
          .eq("email", credentials.email.toLowerCase().trim())
          .single();

        if (error || !user) {
          log.warn("auth.login.failed", {
            requestId,
            ip,
            reason: error && error.message !== "No rows returned" ? "db_error" : "user_not_found",
            email: attemptedEmail,
            error: error && error.message !== "No rows returned" ? error : undefined,
          });
          throw new Error("Invalid email or password");
        }

        const userSummary = summarizeUser(user);

        if (user.status === "pending") {
          log.warn("auth.login.failed", { requestId, ip, reason: "pending_approval", user: userSummary });
          throw new Error("Your account is pending admin approval");
        }

        if (user.status === "rejected") {
          log.warn("auth.login.failed", { requestId, ip, reason: "account_rejected", user: userSummary });
          throw new Error("Your account has been rejected");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          log.warn("auth.login.failed", { requestId, ip, reason: "invalid_password", user: userSummary });
          throw new Error("Invalid email or password");
        }

        log.info("auth.login.success", { requestId, ip, user: { ...userSummary, district: user.district } });

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
