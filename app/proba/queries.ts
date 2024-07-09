import { createClient } from "@/lib/client";
import axiosInstance from "./axiosInterceptorInstance";
import { QueryClient } from "@tanstack/react-query";
import { ClockifyToken } from "@/lib/models/clockify-token";
import { subMonths, addYears, addHours, parse, formatISO } from "date-fns";

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

export const fetchUser = async (jwt: ClockifyToken) => {
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

export const fetchGoogleCalendars = async (
  jwt: ClockifyToken,
  queryClient: QueryClient
) => {
  let scopedUser = queryClient.getQueryData(["user"]) as any;
  const supabase = createClient();

  if (scopedUser.provider?.google.auth.expiry_date < new Date()) {
    let response = await axiosInstance.post(
      "https://herring-endless-firmly.ngrok-free.app/api/auth/refresh",
      {
        refreshToken: scopedUser.provider.google.auth.refresh_token,
      }
    );
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
              calendarId: scopedUser.provider.google.calendarId,
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

    let updatedUser = await supabase
      .from("users")
      .update({
        provider: {
          ...scopedUser.provider,
          ...{
            google: {
              auth: scopedUser.provider.google.auth,
              sync: scopedUser.provider.google.sync,
              calendarId: newCalendar.data.id,
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

    return newCalendar.data;
  }

  return clockifyCalendar;
};

export const timeEntriesSyncMutation = async (
  jwt: ClockifyToken,
  authToken: string,
  queryClient: QueryClient,
  controlValue: boolean,
  calendar: string,
  type: string
) => {
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  if (!controlValue || scopedUser.provider.google.sync[type].initialized) {
    await updateFormStateInDatabase(
      scopedUser,
      type,
      controlValue,
      jwt,
      queryClient
    );
    return [];
  }

  try {
    const timeEntries = await axiosInstance.get(
      `https://developer.clockify.me/api/v1/workspaces/${jwt?.workspaceId}/user/${jwt?.user}/time-entries`,
      {
        headers: {
          "x-addon-token": authToken,
        },
      }
    );

    if (calendar === "Google" && timeEntries.data.length > 0) {
      await syncWithGoogleCalendar(timeEntries.data, queryClient);
    } else if (calendar === "Azure" && timeEntries.data.length > 0) {
      await syncWithAzureCalendar(timeEntries, queryClient);
    }
  } catch (error) {
    throw error;
  }

  await updateFormStateInDatabase(
    scopedUser,
    type,
    controlValue,
    jwt,
    queryClient
  );
};

export const timeOffSyncMutation = async (
  jwt: ClockifyToken,
  queryClient: QueryClient,
  controlValue: boolean,
  calendar: string,
  type: string
) => {
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  updateFormStateInDatabase(scopedUser, type, controlValue, jwt, queryClient);
};

export const scheduledTimeSyncMutation = async (
  jwt: ClockifyToken,
  authToken: string,
  queryClient: QueryClient,
  controlValue: boolean,
  calendar: string,
  type: string
) => {
  let scopedUser = queryClient.getQueryData(["user"]) as any;

  if (!controlValue || scopedUser.provider.google.sync[type].initialized) {
    await updateFormStateInDatabase(
      scopedUser,
      type,
      controlValue,
      jwt,
      queryClient
    );
    return [];
  }

  try {
    // return [];
    const scheduledTimes = await axiosInstance.get(
      `https://developer.clockify.me/api/v1/workspaces/${jwt.workspaceId}/scheduling/assignments/all`,
      {
        headers: {
          "x-addon-token": authToken,
          // "X-Api-Key": "YWQwOWI5YWQtMDdkMy00YjNiLWFlZDQtOTJmZGE0ODg1Mjcw",
        },
        params: {
          start: subMonths(new Date(), 3),
          end: addYears(new Date(), 3),
          "page-size": "5000",
          page: "1",
        },
      }
    );

    const dataForSycn = scheduledTimes.data
      .filter((time: any) => time.userId === scopedUser.id)
      .map((time: any) => {
        console.log(time);
        time.timeInterval = {};
        time.timeInterval.start = formatISO(
          parse(time.startTime, "HH:mm", new Date(time.period.start))
        );

        time.timeInterval.end = formatISO(
          addHours(time.timeInterval.start, time.hoursPerDay)
        );

        time.description = time.note;
        return time;
      });
    console.log(dataForSycn);

    if (calendar === "Google" && dataForSycn.length > 0) {
      await syncWithGoogleCalendar(dataForSycn, queryClient);
    } else if (calendar === "Azure" && dataForSycn.length > 0) {
      await syncWithAzureCalendar(dataForSycn, queryClient);
    }
  } catch (error) {
    throw error;
  }

  updateFormStateInDatabase(scopedUser, type, controlValue, jwt, queryClient);
};

function syncWithAzureCalendar(timeEntries: any, queryClient: QueryClient) {}

async function syncWithGoogleCalendar(
  timeEntries: any,
  queryClient: QueryClient
) {
  console.log(timeEntries);

  let scopedUser = queryClient.getQueryData(["user"]) as any;

  const boundary = "batch_google_calendar";
  let combinedBody = "";
  timeEntries.forEach((entrie: any) => {
    combinedBody += `--${boundary}`;
    combinedBody += `\r\n`;
    combinedBody += `Content-Type: application/http`;
    combinedBody += `\r\n`;
    combinedBody += `Authorization: ${scopedUser.provider.google.auth.token_type} ${scopedUser.provider.google.auth.access_token}`;
    combinedBody += `\r\n`;
    combinedBody += `\r\n`;
    combinedBody += `POST /calendar/v3/calendars/${scopedUser.provider.google.calendarId}/events`;
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

async function updateFormStateInDatabase(
  scopedUser: any,
  type: string,
  formControlValue: any,
  jwt: ClockifyToken,
  queryClient: QueryClient
) {
  const supabase = createClient();

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
                [type]: {
                  value: formControlValue,
                  initialized: true,
                },
              },
            },
            calendarId: scopedUser.provider.google.calendarId,
          },
        },
      },
    })
    .eq("id", jwt.user)
    .select("*");

  if (updatedUser?.data) {
    queryClient.setQueryData(["user"], updatedUser.data[0]);
  }
}
