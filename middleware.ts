import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const isDashboardRoute = path === "/dashboard" || path.startsWith("/dashboard/");
    const isProfileRoute = path === "/profile" || path.startsWith("/profile/");
    const isAdminRoute = path === "/admin" || path.startsWith("/admin/");

    if ((isDashboardRoute || isAdminRoute || isProfileRoute) && !token) {
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

        // Public routes
        if (
          path === "/" ||
          path === "/login" ||
          path === "/signup" ||
          path === "/forgot-password" ||
          path === "/reset-password" ||
          path === "/terms" ||
          path === "/privacy-policy" ||
          path.startsWith("/api/auth")
        ) {
          return true;
        }

        if ((path === "/dashboard" || path.startsWith("/dashboard/")) || (path === "/admin" || path.startsWith("/admin/"))) {
          return !!token && !!token.is_admin;
        }

        if (path === "/profile" || path.startsWith("/profile/")) {
          return !!token;
        }

        // Protected routes require auth
        return !!token;
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
