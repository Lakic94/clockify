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
import { any, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCalendars,
  fetchClockifyUser,
  fetchGoogleCalendars,
  fetchUser,
  timeEntriesSyncMutation,
} from "./queries";
import QueryTestComp from "@/components/quertTestComp";

export default function ProbaTest(oauth2Client: any) {
  const [token, setToken] = useState<Credentials | null>();
  const [activeWorkspace, setActiveWorkspace] = useState<any>();
  const [activeUser, setActiveUser] = useState<any>();
  const [activeUserId, setActiveUserId] = useState<any>();
  const [inited, setInited] = useState(false);
  const [authToken, setAuthToken] = useState<any>();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();

  const jwt = jwtDecode(searchParams?.get("auth_token") as string) as any;

  const formSchema = z.object({
    googleTimeEntry: z.boolean().default(false),
    googleTimeOff: z.boolean().default(false),
    googleScheduledTime: z.boolean().default(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      googleTimeEntry: false,
      googleTimeOff: false,
      googleScheduledTime: false,
    },
  });

  const {
    data: clockifyUser,
    refetch: refetchClockifyUser,
    isFetching: isLoadingClockifyUser,
  } = useQuery({
    queryKey: ["clockifyUser"],
    queryFn: () =>
      fetchClockifyUser(jwt, searchParams?.get("auth_token") as string),
    staleTime: Infinity,
    refetchInterval: false,
    retry: 0,
  });
  console.log(clockifyUser);

  const {
    data: supabaseUser,
    refetch: refetchSupabaseUser,
    isFetching: isLoadingSupabaseUser,
  } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetchUser(jwt, clockifyUser),
    staleTime: Infinity,
    refetchInterval: false,
    enabled: !!clockifyUser,
  });

  console.log(supabaseUser);

  let pca: PublicClientApplication;
  pca = new PublicClientApplication({
    auth: {
      clientId: "105e00b0-cea0-472f-95ae-399b96679df6",
      redirectUri:
        "https://herring-endless-firmly.ngrok-free.app/api/auth/azure",
    },
  });

  let b: any;

  const {
    data: googleCalendars,
    refetch: refetchGoogleCalendars,
    isFetching: isLoadingGoogleCalendars,
  } = useQuery({
    queryKey: ["calendars"],
    queryFn: () => fetchGoogleCalendars(jwt, queryClient),
    staleTime: Infinity,
    refetchInterval: false,
    enabled: !!supabaseUser?.provider?.google?.auth,
  });
  console.log(googleCalendars);

  const { mutate: timeEntriesSync, isPending } = useMutation({
    // queryKey: ["timeEntriesSync"],
    mutationFn: ({ calendar, type }: { calendar: string; type: string }) =>
      timeEntriesSyncMutation(
        jwt,
        searchParams.get("auth_token") as string,
        queryClient,
        (form.getValues() as any)[type],
        calendar,
        type
      ),
    onSuccess: async (codeResponse) => {
      console.log(codeResponse);
    },
    onError: (error) => {
      console.log(error);
      form.setValue("googleTimeEntry", !form.getValues().googleTimeEntry);
    },
  });

  useEffect(() => {
    const initializeMsal = async () => {
      b = await pca.initialize(); // Initialize MSAL instance
      setInited(true);
    };
    initializeMsal();
  }, []);

  async function azureLogin() {
    await pca.initialize();
    let a = await pca.loginPopup();
    const supabase = createClient();
    const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;

    const exisingUser = await supabase
      .from("users")
      .select()
      .eq("id", jwt.user as string);

    if (exisingUser?.data) {
      let updatedUser = await supabase
        .from("users")
        .update({
          provider: {
            ...exisingUser.data[0].provider,
            ...{
              azure: {
                access_token: a.accessToken,
              },
            },
          },
        })
        .eq("id", jwt.user as string)
        .select("*");
    }

    refetchSupabaseUser();
  }

  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar",
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      const tokens = await axiosInstance.post(
        "https://herring-endless-firmly.ngrok-free.app/api/auth",
        {
          code: codeResponse.code,
        }
      );
      localStorage.setItem("auth", JSON.stringify(tokens.data));
      const supabase = createClient();
      const jwt = jwtDecode(searchParams.get("auth_token") as string) as any;

      const exisingUser = queryClient.getQueryData(["user"]) as any;

      if (exisingUser) {
        const updatedUser = await supabase
          .from("users")
          .update({
            provider: {
              ...exisingUser.provider,
              ...{
                google: {
                  auth: tokens.data,
                  sync: {
                    googleTimeEntry: false,
                    googleTimeOff: false,
                    googleScheduledTime: false,
                  },
                },
              },
            },
          })
          .eq("id", jwt.user as string)
          .select("*");
        if (updatedUser?.data) {
          queryClient.setQueryData(["user"], updatedUser.data[0]);
        }
      }

      setToken(tokens.data);
    },
    onError: (errorResponse) => console.log(errorResponse),
    onNonOAuthError: (errorResponse) => console.log(errorResponse),
  });

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
  const loadingArray = [
    isLoadingGoogleCalendars,
    isLoadingSupabaseUser,
    isPending,
  ];

  return (
    <div className="flex flex-col items-start p-28 gap-12">
      {loadingArray.some((el) => el) && <div className="h-20">loading</div>}
      <div>
        <div className="flex flex-row gap-4 items-center">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-6"
            >
              <FormField
                control={form.control}
                name="googleTimeEntry"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Time entry</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(e) => {
                          field.onChange(e);
                          timeEntriesSync({
                            calendar: "Google",
                            type: field.name,
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="googleTimeOff"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Time off</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="googleScheduledTime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Scheduled time</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(e) => {
                          field.onChange(e);
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
              supabaseUser && supabaseUser?.provider?.google?.auth
                ? "bg-green-600"
                : "bg-blue-600"
            }`}
          >
            {supabaseUser && supabaseUser?.provider?.google?.auth
              ? "Connected"
              : "Connect"}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex flex-row gap-4 items-center">
          Azure Calendar
          <Button
            onClick={azureLogin}
            className={`${
              supabaseUser && supabaseUser?.provider?.azure
                ? "bg-green-600"
                : "bg-blue-600"
            }`}
          >
            {supabaseUser && supabaseUser?.provider?.azure
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
        {activeUser && !activeUser?.provider?.google?.auth && (
          <Button onClick={googleLogin}>Login</Button>
        )}
        {activeUser && !activeUser?.provider?.azure && (
          <Button onClick={async () => {}}>Azure Login</Button>
        )}
        <Button
          onClick={() => {
            refetchGoogleCalendars();
          }}
        >
          List Calendars
        </Button>
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
          }}
        >
          get active user
        </Button>
      </div>
      {/* <QueryTestComp /> */}
    </div>
  );
}
