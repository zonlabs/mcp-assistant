import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthorized and trying to access protected routes
  // For now, we only protect routes that are explicitly not /signin or public
  // Adjust this matching logic to your specific needs
  if (!user && !request.nextUrl.pathname.startsWith("/signin")) {
    // If you have specific protected routes, add check here.
    // For example, if you want to protect everything except signin:
    if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/protected")) {
      // return NextResponse.redirect(new URL("/signin", request.url));
    }
  }

  // If authorized and trying to access /signin
  if (user && request.nextUrl.pathname.startsWith("/signin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};