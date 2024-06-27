import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body = await request.json();
  const oAuth2Client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_SECRET,
    "postmessage"
  );

  const { tokens } = await oAuth2Client.getToken(body.code); // exchange code for tokens

  return NextResponse.json(tokens);
}
