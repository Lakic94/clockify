import { createClient } from "@/lib/server";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

export async function POST(request: Request, response: Response) {
  // console.log(request.url, "da to je to", request.body);
  const body = await request.json();
  const supabase = createClient();
  console.log(body, "time off requested");
  // return NextResponse.json("response");
  if (body.status.statusType !== "APPROVED") {
    return NextResponse.json("time off requested");
  }

  let scopedUser = null;

  const user = await supabase
    .from("users")
    .select()
    .eq("id", body.userId as string);
  if (!user.data) {
    return;
  }
  scopedUser = user.data[0];
  console.log(
    user.data[0].provider?.google?.sync?.googleTimeOff?.value,
    "user.data[0]"
  );

  if (user.data && user.data[0].provider?.google?.sync?.googleTimeOff?.value) {
    // console.log(user.data[0], 'user.data[0]');

    if (user.data[0].provider?.google.auth.expiry_date < new Date()) {
      let response = await axios.post(
        "https://herring-endless-firmly.ngrok-free.app/api/auth/refresh",
        {
          refreshToken: user.data[0].provider.google.auth.refresh_token,
        }
      );
      let newAuthObject = response.data;

      let updatedUser = await supabase
        .from("users")
        .update({
          provider: {
            ...user.data[0].provider,
            ...{
              google: {
                auth: newAuthObject,
                sync: user.data[0].provider.google.sync,
                calendarId: user.data[0].provider.google.calendarId,
              },
            },
          },
        })
        .eq("id", body.userId as string)
        .select("*");
      if (updatedUser?.data) {
        scopedUser = updatedUser.data[0];
      }
    }
    console.log(scopedUser.provider.google, "scopedUser");

    let start = body.timeOffPeriod.period.start;
    let end = body.timeOffPeriod.period.end;

    if (body.timeOffPeriod?.halfDay) {
      start = body.timeOffPeriod.halfDayHours.start;
      end = body.timeOffPeriod.halfDayHours.end;
    }

    let response = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${scopedUser.provider.google.calendarId}/events`,
      {
        summary: body.note,
        start: {
          dateTime: start,
        },
        end: {
          dateTime: end,
        },
      },
      {
        headers: {
          Authorization: `${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`,
        },
      }
    );

    console.log(response.data);
    return NextResponse.json(response.data);
  }

  return NextResponse.json("installed");
}
