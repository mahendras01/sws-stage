import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { canUserLogin } from "./auth-flow";
import { queryRows } from "./postgres";
import { log, newRequestId, summarizeUser } from "./logger";

export const MAX_SESSION_AGE_SECONDS = 7 * 24 * 60 * 60;

export function passwordHashVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex");
}

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

        if (!canUserLogin(user.status)) {
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
          passwordHashVersion: passwordHashVersion(user.password_hash),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: MAX_SESSION_AGE_SECONDS,
    updateAge: 0,
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
        token.passwordHashVersion = (user as any).passwordHashVersion;
        token.sessionExpiresAt = Date.now() + MAX_SESSION_AGE_SECONDS * 1000;
      }

      const expiresAt = typeof token.sessionExpiresAt === "number"
        ? token.sessionExpiresAt
        : (typeof token.iat === "number" ? token.iat * 1000 : Date.now()) + MAX_SESSION_AGE_SECONDS * 1000;

      if (Date.now() >= expiresAt) {
        token.invalid = true;
        return token;
      }

      token.sessionExpiresAt = expiresAt;

      const userId = typeof token.id === "string" ? token.id : undefined;
      if (!userId) {
        token.invalid = true;
        return token;
      }

      try {
        const rows = await queryRows<any>(
          "SELECT id, email, name, password_hash, status, is_admin, role, district FROM users WHERE id = $1 LIMIT 1",
          [userId],
        );
        const freshUser = rows[0];

        if (!freshUser || !canUserLogin(freshUser.status)) {
          token.invalid = true;
          return token;
        }

        const currentPasswordVersion = passwordHashVersion(freshUser.password_hash);
        if (token.passwordHashVersion !== currentPasswordVersion) {
          token.invalid = true;
          return token;
        }

        token.id = freshUser.id;
        token.email = freshUser.email;
        token.name = freshUser.name;
        token.is_admin = Boolean(freshUser.is_admin);
        token.role = freshUser.role ?? "user";
        token.district = freshUser.district ?? null;
        token.status = freshUser.status ?? "pending";
        token.invalid = false;
      } catch (error) {
        log.warn("auth.session.validation_failed", { userId, error: error instanceof Error ? error.message : String(error) });
        token.invalid = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.invalid) return null as any;

      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.is_admin = Boolean(token.is_admin);
        session.user.role = (token.role as any) ?? "user";
        session.user.district = (token.district as string | null) ?? null;
        session.user.status = (token.status as any) ?? "pending";
        session.user.name = (token.name as string | null) ?? session.user.name;
        session.user.email = (token.email as string | null) ?? session.user.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
