import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const isDashboardRoute = path === "/dashboard" || path.startsWith("/dashboard/");
    const isProfileRoute = path === "/profile" || path.startsWith("/profile/");
    const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
    const expiresAt = typeof token?.sessionExpiresAt === "number" ? token.sessionExpiresAt : undefined;
    const isExpired = expiresAt !== undefined && Date.now() >= expiresAt;

    if (((isDashboardRoute || isAdminRoute || isProfileRoute) && (!token || token.invalid || isExpired))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if ((isDashboardRoute || isAdminRoute) && !token?.is_admin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const expiresAt = typeof token?.sessionExpiresAt === "number" ? token.sessionExpiresAt : undefined;
        const isExpired = expiresAt !== undefined && Date.now() >= expiresAt;
        const isValidToken = !!token && !token.invalid && !isExpired;

        // Public routes
        if (
          path === "/" ||
          path === "/login" ||
          path === "/signup" ||
          path === "/terms" ||
          path === "/privacy-policy" ||
          path.startsWith("/api/auth")
        ) {
          return true;
        }

        if ((path === "/dashboard" || path.startsWith("/dashboard/")) || (path === "/admin" || path.startsWith("/admin/"))) {
          return isValidToken && !!token?.is_admin;
        }

        if (path === "/profile" || path.startsWith("/profile/")) {
          return isValidToken;
        }

        // Protected routes require auth
        return isValidToken;
      },
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/contribution-details/:path*",
    "/admin/:path*",
    "/upload-receipt",
  ],
};
