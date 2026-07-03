import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createSession, hashPassword, normalizeEmail, uniqueNicknameFromEmail } from "@/lib/auth";
import { appOrigin, authErrorRedirect, verifyGoogleState } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  sub?: string;
};

export async function GET(request: Request) {
  const origin = await appOrigin();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(authErrorRedirect(origin, "Accesso Google annullato."));
  }

  if (!code || !(await verifyGoogleState(state))) {
    return NextResponse.redirect(authErrorRedirect(origin, "Sessione Google scaduta. Riprova."));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(authErrorRedirect(origin, "Google Login non e ancora configurato: mancano le chiavi OAuth."));
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenPayload.id_token) {
      console.error("Google token exchange failed", tokenPayload);
      return NextResponse.redirect(authErrorRedirect(origin, "Google non ha completato l'accesso. Controlla redirect URI e chiavi OAuth."));
    }

    const profileResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenPayload.id_token)}`);
    const profile = (await profileResponse.json()) as GoogleProfile;
    const verified = profile.email_verified === true || profile.email_verified === "true";
    const email = normalizeEmail(profile.email ?? "");

    if (!profileResponse.ok || !email || !verified) {
      console.error("Google profile verification failed", profile);
      return NextResponse.redirect(authErrorRedirect(origin, "Google non ha confermato l'e-mail del profilo."));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    const user =
      existing ??
      (await prisma.user.create({
        data: {
          email,
          displayName: profile.name?.trim().slice(0, 40) || email.split("@")[0],
          nickname: await uniqueNicknameFromEmail(email),
          passwordHash: hashPassword(randomBytes(32).toString("hex"))
        }
      }));

    if (existing && !existing.displayName && profile.name) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { displayName: profile.name.trim().slice(0, 40) }
      });
    }

    await createSession(user.id);
    return NextResponse.redirect(new URL("/", origin));
  } catch (caught) {
    console.error("Google OAuth callback failed", caught);
    return NextResponse.redirect(authErrorRedirect(origin, "Accesso Google non riuscito. Riprova tra poco."));
  }
}
