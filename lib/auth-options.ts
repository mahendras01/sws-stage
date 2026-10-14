import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryRows } from "./postgres";
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
        const rawIdentifier = String(credentials?.email ?? "").trim();
        const attemptedEmail = rawIdentifier.toLowerCase();
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0].trim();

        if (!rawIdentifier || !credentials?.password) {
          log.warn("auth.login.failed", { requestId, ip, reason: "missing_credentials", email: attemptedEmail || null });
          throw new Error("Email/mobile number and password are required");
        }

        const normalizedDigits = rawIdentifier.replace(/\D/g, "");
        const isEmailInput = rawIdentifier.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);
        const isMobileInput = /^\d{10}$/.test(normalizedDigits);

        if (!isEmailInput && !isMobileInput) {
          log.warn("auth.login.failed", { requestId, ip, reason: "invalid_identifier", identifier: rawIdentifier });
          throw new Error("Invalid email or mobile number");
        }

        let user: any = null;
        let error: { message: string } | null = null;

        try {
          if (isEmailInput) {
            const rows = await queryRows<any>(
              "SELECT id, email, name, password_hash, status, is_admin, role, district, phone_number, ehrms_code FROM users WHERE LOWER(email) = $1 LIMIT 1",
              [rawIdentifier.toLowerCase()],
            );
            user = rows[0] ?? null;
          } else {
            const rows = await queryRows<any>(
              "SELECT id, email, name, password_hash, status, is_admin, role, district, phone_number, ehrms_code FROM users WHERE phone_number = $1 OR REPLACE(phone_number, ' ', '') = $1 LIMIT 1",
              [normalizedDigits],
            );
            user = rows[0] ?? null;
          }
        } catch (dbError: any) {
          error = { message: dbError?.message ?? "Database error" };
        }

        if (error || !user) {
          log.warn("auth.login.failed", {
            requestId,
            ip,
            reason: error ? "db_error" : "user_not_found",
            email: attemptedEmail,
            identifierType: isEmailInput ? "email" : "mobile",
            error: error ?? undefined,
          });
          throw new Error("Invalid email/mobile number or password");
        }

        if (user.role === "super_admin" && isMobileInput) {
          log.warn("auth.login.failed", { requestId, ip, reason: "super_admin_mobile_blocked", user: summarizeUser(user) });
          throw new Error("Invalid email/mobile number or password");
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
          throw new Error("Invalid email/mobile number or password");
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
          let freshUser: any = null;
          let error: any = null;

          try {
            const rows = await queryRows<any>(
              "SELECT id, email, name, status, is_admin, role, district FROM users WHERE id = $1 LIMIT 1",
              [userId],
            );
            freshUser = rows[0] ?? null;
          } catch (dbError) {
            error = dbError;
          }

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
