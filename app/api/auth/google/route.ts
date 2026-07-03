import { NextResponse } from "next/server";
import { appOrigin, authErrorRedirect, createGoogleState } from "@/lib/oauth";

export async function GET() {
  const origin = await appOrigin();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(authErrorRedirect(origin, "Google Login non e ancora configurato: manca GOOGLE_CLIENT_ID."));
  }

  const state = await createGoogleState();
  const redirectUri = `${origin}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url);
}
