import { createClient } from "@/lib/client";
import axiosInstance from "./axiosInterceptorInstance";
import { useQueryClient } from "@tanstack/react-query";
import { ClockifyToken } from "@/lib/models/clockify-token";

export const fetchCalendars = async (supabaseUser: any) => {
  localStorage.setItem(
    "auth",
    JSON.stringify(supabaseUser.provider.google.auth)
  );

  const response = await axiosInstance.get(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${supabaseUser.provider.google.auth.access_token}`,
      },
    }
  );

  return response.data;
};

export const fetchUser = async (jwt: ClockifyToken, clockifyUser: any) => {
  const supabase = createClient();
  const exisitingUser = await supabase
    .from("users")
    .select()
    .eq("id", jwt.user);

  if (!exisitingUser.data?.length) {
    const createdUser = await supabase
      .from("users")
      .insert({
        id: jwt.user,
        first_name: clockifyUser.name,
        email: clockifyUser.email,
      })
      .select("*");
    if (createdUser.data?.length) {
      localStorage.setItem(
        "auth",
        JSON.stringify(createdUser.data[0].provider)
      );
      return createdUser.data[0];
    }
  }
  if (exisitingUser.data?.length) {
    localStorage.setItem(
      "auth",
      JSON.stringify(exisitingUser.data[0].provider)
    );
    return exisitingUser.data[0];
  }
};

export const fetchClockifyUser = async (jwt: ClockifyToken, token: string) => {
  let response = await axiosInstance.get(
    `https://developer.clockify.me/api/v1/workspaces/${jwt.workspaceId}/member-profile/${jwt.user}`,
    {
      headers: {
        "x-addon-token": token,
      },
    }
  );
  return response.data;
};

export const fetchGoogleCalendars = async (jwt: any, queryClient: any) => {
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  if (scopedUser.provider?.google.auth.expiry_date < new Date()) {
    let response = await axiosInstance.post(
      "https://herring-endless-firmly.ngrok-free.app/api/auth/refresh",
      {
        refreshToken: scopedUser.provider.google.auth.refresh_token,
      }
    );
    const supabase = createClient();
    let newAuthObject = response.data;

    let updatedUser = await supabase
      .from("users")
      .update({
        provider: {
          ...scopedUser.provider,
          ...{
            google: {
              auth: newAuthObject,
              sync: scopedUser.provider.google.sync,
            },
          },
        },
      })
      .eq("id", jwt.user as string)
      .select("*");
    if (updatedUser?.data) {
      scopedUser = updatedUser.data[0];
      queryClient.setQueryData(["user"], updatedUser.data[0]);
    }
  }
  let response = await axiosInstance.get(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`,
      },
    }
  );

  if (!response) {
    return null;
  }

  let clockifyCalendar = null;
  const has = response.data.items.some((item: any) => {
    if (item.summary === "Clockify Addon Calendar") {
      clockifyCalendar = item;
    }

    return item.summary === "Clockify Addon Calendar";
  });

  if (!has) {
    const newCalendar = await axiosInstance.post(
      "https://www.googleapis.com/calendar/v3/calendars",
      {
        summary: "Clockify Addon Calendar",
      },
      {
        headers: {
          Authorization: `${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`,
        },
      }
    );

    return newCalendar.data;
  }

  return clockifyCalendar;
};

export const timeEntriesSyncMutation = async (
  jwt: ClockifyToken,
  authToken: string,
  queryClient: any,
  timeEntryValue: any,
  calendar: any,
  type: any
) => {
  if (timeEntryValue) {
    try {
      const timeEntries = await axiosInstance.get(
        `https://developer.clockify.me/api/v1/workspaces/${
          jwt?.workspaceId as string
        }/user/${jwt?.user as string}/time-entries`,
        {
          headers: {
            "x-addon-token": authToken,
          },
        }
      );
      if (calendar === "Google") {
        await syncWithGoogleCalendar(timeEntries, queryClient);
      } else {
        syncWithAzureCalendar(timeEntries, queryClient);
      }
    } catch (error) {
      throw error;
    }
  }

  const supabase = createClient();
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  let updatedUser = await supabase
    .from("users")
    .update({
      provider: {
        ...scopedUser.provider,
        ...{
          google: {
            auth: scopedUser.provider.google.auth,
            sync: {
              ...scopedUser.provider.google.sync,
              ...{
                [type]: timeEntryValue,
              },
            },
          },
        },
      },
    })
    .eq("id", jwt.user as string)
    .select("*");
};

function syncWithAzureCalendar(timeEntries: any, queryClient: any) {}

async function syncWithGoogleCalendar(timeEntries: any, queryClient: any) {
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  const boundary = "batch_google_calendar";
  let combinedBody = "";
  timeEntries.data.forEach((entrie: any) => {
    combinedBody += `--${boundary}`;
    combinedBody += `\r\n`;
    combinedBody += `Content-Type: application/http`;
    combinedBody += `\r\n`;
    combinedBody += `Authorization: ${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`;
    combinedBody += `\r\n`;
    combinedBody += `\r\n`;
    combinedBody += `POST /calendar/v3/calendars/e44a1d6d305c310440d0723ddacfcdc3d203ee1f42bedaed29da757f6bd27a12@group.calendar.google.com/events`;
    combinedBody += `\r\n`;
    combinedBody += `Content-Type: application/json`;
    combinedBody += `\r\n`;
    combinedBody += `\r\n`;

    combinedBody += `{
  "summary": "${entrie.description}",
  "start": {
    "dateTime": "${entrie.timeInterval.start}"
  },
  "end": {
    "dateTime": "${entrie.timeInterval.end}"
  }
}`;
    combinedBody += `\r\n`;
  });

  combinedBody += `--${boundary}--`;

  const contentLength = Buffer.byteLength(combinedBody, "utf-8");

  try {
    const response = await axiosInstance.post(
      `https://www.googleapis.com/batch/calendar/v3`,
      combinedBody,
      {
        headers: {
          Authorization: `${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`,
          "Content-Type": `multipart/mixed; boundary=${boundary}`,
          "Content-Length": contentLength,
        },
      }
    );

    return response;
  } catch (error) {
    throw error;
  }
}
