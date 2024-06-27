"use client";
import {
  TokenResponse,
  hasGrantedAnyScopeGoogle,
  useGoogleLogin,
} from "@react-oauth/google";
// import axiosInstance from "axios";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Credentials } from "google-auth-library";
import { Switch } from "@/components/ui/switch";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "./axiosInterceptorInstance";
import { PublicClientApplication } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { createClient } from "@/lib/client";
import { name } from "@azure/msal-browser/dist/packageMetadata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendars, fetchUser } from "./queries";

export default function ProbaTest(oauth2Client: any) {
  const [token, setToken] = useState<Credentials | null>();
  const [activeWorkspace, setActiveWorkspace] = useState<any>();
  const [activeUser, setActiveUser] = useState<any>();
  const [activeUserId, setActiveUserId] = useState<any>();
  const [inited, setInited] = useState(false);
  const [authToken, setAuthToken] = useState<any>();

  const searchParams = useSearchParams();
  const jwt = jwtDecode(searchParams?.get("auth_token") as string) as any;
  console.log(jwt);

  const formSchema = z.object({
    timeEntry: z.boolean().default(false),
    timeOff: z.boolean().default(false),
    scheduledTime: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      timeEntry: false,
      timeOff: false,
      scheduledTime: false,
    },
  });
  form.watch();

  // const { data: googleCalendars } = useQuery({
  //   queryKey: ["calendars"],
  //   queryFn: async () => {
  //     axiosInstance
  //       .get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
  //         headers: {
  //           Authorization: `${token.token_type} ${token.access_token}`,
  //         },
  //       })
  //       .then((res) => {
  //         console.log(res);
  //       })
  //       .catch((e) => {
  //         console.log(e);
  //       });
  //     return response.json();
  //   },
  //   staleTime: Infinity,
  // });

  const { data: supabaseUser } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetchUser(jwt.user),
    staleTime: Infinity,
    refetchInterval: false,
  });
  console.log(supabaseUser);

  const { data: userGoogleCalendars, fetchStatus } = useQuery({
    queryKey: ["calendars"],
    queryFn: () => fetchCalendars(supabaseUser),
    staleTime: Infinity,
    refetchInterval: false,
    enabled: !!supabaseUser?.provider?.google,
  });
  console.log(userGoogleCalendars);

  let pca: PublicClientApplication;
  pca = new PublicClientApplication({
    auth: {
      clientId: "105e00b0-cea0-472f-95ae-399b96679df6",
      redirectUri:
        "https://herring-endless-firmly.ngrok-free.app/api/auth/azure",
    },
  });

  let b: any;

  useEffect(() => {
    const initializeMsal = async () => {
      b = await pca.initialize(); // Initialize MSAL instance
      // setInitialized(true);
      console.log(b);
      // console.log(pca.loginPopup());
      setInited(true);
    };
    initializeMsal();
    // const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;
    // setAuthToken(jwt);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;
    // console.log(jwt);

    // supabase
    //   .from("users")
    //   .select()
    //   .eq("id", jwt.user as string)
    //   .then(async (res) => {
    //     console.log(res);
    //     if (!res.data?.length) {
    //       console.log("no user");

    //       let a = await supabase.from("users").insert({
    //         id: jwt.user as string,
    //         first_name: "test",
    //       });
    //       console.log(a);
    //     }
    //     if (res.data) {
    //       setActiveUser(res?.data[0]);
    //     }
    //   });
  }, []);

  useEffect(() => {
    console.log("rerun");
  }, []);

  const { instance, accounts, inProgress } = useMsal();

  const tet = useSearchParams();

  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar",
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      console.log(codeResponse);
      const tokens = await axiosInstance.post(
        "https://herring-endless-firmly.ngrok-free.app/api/auth",
        {
          code: codeResponse.code,
        }
      );
      localStorage.setItem("auth", JSON.stringify(tokens.data));
      const supabase = createClient();
      const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;

      supabase
        .from("users")
        .select()
        .eq("id", jwt.user as string)
        .then(async (res) => {
          console.log(res);
          if (res.data?.length) {
            console.log("no user");

            let a = await supabase
              .from("users")
              .update({
                provider: {
                  ...res.data[0].provider,
                  ...{ google: tokens.data },
                },
              })
              .eq("id", jwt.user as string);

            console.log(a);
          }
        });

      console.log(tokens);
      setToken(tokens.data);
    },
    onError: (errorResponse) => console.log(errorResponse),
    onNonOAuthError: (errorResponse) => console.log(errorResponse),
  });

  function check() {
    if (!token || token.expiry_date) return;
    console.log(token);
    console.log(new Date(token?.expiry_date ?? "") < new Date());
  }

  function getCalendars() {
    if (!token) {
      return;
    }
    console.log(token);

    axiosInstance
      .get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: {
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      })
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function createCalendar() {
    if (!token) {
      return;
    }
    console.log(token);

    axiosInstance
      .post(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
          summary: "test calendar title",
        },
        {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
          },
        }
      )
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getCalendar() {
    if (!token) {
      return;
    }
    console.log(token);

    axiosInstance
      .get(
        "https://www.googleapis.com/calendar/v3/calendars/46d8f5c031474466112142d6011876acdb829358f5ac1bfabb850821a16ba36a@group.calendar.google.com",
        {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
          },
        }
      )
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getTimeEntries() {
    axiosInstance
      .get(
        `https://developer.clockify.me/api/v1/workspaces/${
          authToken?.workspaceId as string
        }/user/${authToken?.user as string}/time-entries`,
        {
          headers: {
            "x-addon-token": searchParams.get("auth_token"),
          },
        }
      )
      .then((res) => {
        console.log(res);
        // setActiveWorkspace(res.data?.activeWorkspace);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getScheduledEntries() {
    axiosInstance
      .get(
        `https://developer.clockify.me/api/v1/workspaces/${
          authToken?.workspaceId as string
        }/scheduling/assignments/all?start=${new Date().toISOString()}&end=${new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ).toISOString()}`,
        {
          headers: {
            // "x-addon-token": searchParams.get("auth_token"),
            "x-api-key": "ZTFlYjg0OTktOTJiMC00YTNlLTk1NDctOTM5M2JhMzE1OGMw",
          },
        }
      )
      .then((res) => {
        console.log(res);
        // setActiveWorkspace(res.data?.activeWorkspace);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getTimeOff() {
    axiosInstance
      .post(
        `https://developer.clockify.me/pto/workspaces/${
          authToken?.workspaceId as string
        }/requests`,
        {
          page: 1,
          pageSize: 50,
          status: ["PENDING", "APPROVED", "REJECTED"],
          users: { contains: "DOES_NOT_CONTAIN", ids: [], status: "ACTIVE" },
          userGroups: {
            contains: "DOES_NOT_CONTAIN",
            ids: [],
            status: "ACTIVE",
          },
        },
        {
          headers: {
            // "x-addon-token": searchParams.get("auth_token"),
            "x-api-key": "ZTFlYjg0OTktOTJiMC00YTNlLTk1NDctOTM5M2JhMzE1OGMw",
          },
        }
      )
      .then((res) => {
        console.log(res);
        // setActiveWorkspace(res.data?.activeWorkspace);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getCurrentWorkspace() {
    if (!token) {
      return;
    }

    axiosInstance
      .get(
        `https://developer.clockify.me/api/v1/workspaces/${activeWorkspace}`,
        {
          headers: {
            "x-addon-token": searchParams.get("auth_token"),
          },
        }
      )
      .then((res) => {
        console.log(res);
        setActiveWorkspace(res.data?.activeWorkspace);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function getAddonSettings() {
    if (!token) {
      return;
    }

    axiosInstance
      .get(
        `https://developer.clockify.me/api/addon/workspaces/${activeWorkspace}/settings`,
        {
          headers: {
            "x-addon-token": searchParams.get("auth_token"),
          },
        }
      )
      .then((res) => {
        console.log(res);
        setActiveWorkspace(res.data?.activeWorkspace);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  async function azureLogin() {
    await pca.initialize();
    let a = await pca.loginPopup();
    console.log(a);
    const supabase = createClient();
    const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;

    supabase
      .from("users")
      .select()
      .eq("id", jwt.user as string)
      .then(async (res) => {
        console.log(res);
        if (res.data?.length) {
          console.log("no user");
          await supabase
            .from("users")
            .update({
              provider: {
                ...res.data[0].provider,
                ...{
                  azure: {
                    access_token: a.accessToken,
                  },
                },
              },
            })
            .eq("id", jwt.user as string);
        }
      });
  }

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data);
  }

  function createEvent() {
    if (!token) {
      return;
    }
    console.log(token);

    axiosInstance
      .post(
        "https://www.googleapis.com/calendar/v3/calendars/46d8f5c031474466112142d6011876acdb829358f5ac1bfabb850821a16ba36a@group.calendar.google.com/events",
        {
          start: {
            dateTime: "2024-04-05T09:00:00-07:00",
            timeZone: "America/Los_Angeles",
          },
          end: {
            dateTime: "2024-04-06T09:00:00-07:00",
            timeZone: "America/Los_Angeles",
          },
          summary: "Test event title",
        },
        {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
          },
        }
      )
      .then((res) => {
        console.log(res);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  return (
    <div className="flex flex-col items-start p-28 gap-12">
      <div>
        <div className="flex flex-row gap-4 items-center">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-6"
            >
              <FormField
                control={form.control}
                name="timeEntry"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Marketing emails</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(e) => {
                          field.onChange(e);
                          console.log(e);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          Google Calendar
          <Button
            onClick={googleLogin}
            className={`${
              activeUser && activeUser?.provider?.google
                ? "bg-blue-600"
                : "bg-green-600"
            }`}
          >
            {" "}
            {activeUser && activeUser?.provider?.google
              ? "Connected"
              : "Connect"}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Time entries</Label>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Time off</Label>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Scheduled Time</Label>
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-row gap-4 items-center">
          Azure Calendar
          <Button
            onClick={azureLogin}
            className={`${
              activeUser && activeUser?.provider?.google
                ? "bg-blue-600"
                : "bg-green-600"
            }`}
          >
            {activeUser && activeUser?.provider?.google
              ? "Connected"
              : "Connect"}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Time entries</Label>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Time off</Label>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Switch />
            <Label htmlFor="airplane-mode">Scheduled Time</Label>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-4">
        {activeUser && !activeUser?.provider?.google && (
          <Button onClick={googleLogin}>Login</Button>
        )}
        {activeUser && !activeUser?.provider?.azure && (
          <Button onClick={async () => {}}>Azure Login</Button>
        )}
        <Button onClick={check}>Check</Button>
        <Button onClick={getCalendars}>List Calendars</Button>
        <Button onClick={createCalendar}>Create Calendar</Button>
        <Button onClick={createEvent}>Create Event</Button>
        <Button onClick={getCalendar}>Get Calendar</Button>
        <Button onClick={getTimeEntries}>TimeEntries</Button>
        <Button onClick={getScheduledEntries}>ScheduledEntries</Button>
        <Button onClick={getTimeOff}>TimeOff</Button>
        <Button onClick={getCurrentWorkspace}>CurrentWorkspace</Button>
        <Button onClick={getAddonSettings}>AddonSettings</Button>
        <Button
          onClick={async () => {
            await pca.initialize();

            const activeAccount = pca.getActiveAccount();
            // pca.acquireTokenSilent()
            console.log(activeAccount);
          }}
        >
          get active user
        </Button>
      </div>
    </div>
  );
}
