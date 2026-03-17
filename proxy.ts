import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const INTERNAL_AUTH_REALM = 'Basic realm="Stride Stack Internal"';

export function proxy(request: NextRequest) {
  const username = process.env.INTERNAL_BASIC_AUTH_USERNAME;
  const password = process.env.INTERNAL_BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return new NextResponse("Internal access is not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const expected = `Basic ${btoa(`${username}:${password}`)}`;

  if (authorization === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": INTERNAL_AUTH_REALM,
    },
  });
}

export const config = {
  matcher: ["/internal/:path*"],
};
