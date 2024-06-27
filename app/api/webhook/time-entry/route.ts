import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

export async function POST(request: Request, response: Response) {
  console.log(request.url, "da to je to", request.body);
  const body = await request.json();
  console.log(body);

  const oAuth2Client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_SECRET,
    "postmessage"
  );
  let a = await oAuth2Client.credentials;
  console.log(a);

  return NextResponse.json({ response: "installed" });
}
