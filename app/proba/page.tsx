"use client";
import { useGoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "./axiosInterceptorInstance";
import { PublicClientApplication } from "@azure/msal-browser";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchGoogleCalendars,
  fetchUser,
  scheduledTimeSyncMutation,
  timeEntriesSyncMutation,
  timeOffSyncMutation,
} from "./queries";
import Loading from "@/components/loading";

export default function ProbaTest() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  let jwt: any;

  if (searchParams?.get("auth_token")) {
    jwt = jwtDecode(searchParams?.get("auth_token") ?? "");
  }

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
    data: supabaseUser,
    refetch: refetchSupabaseUser,
    isFetching: isLoadingSupabaseUser,
  } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetchUser(jwt),
    staleTime: Infinity,
    refetchInterval: false,
  });

  useEffect(() => {
    console.log(supabaseUser);

    if (!supabaseUser) {
      return;
    }
    form.reset({
      googleTimeEntry:
        !!supabaseUser?.provider?.google?.sync?.googleTimeEntry?.value,
      googleTimeOff:
        !!supabaseUser?.provider?.google?.sync?.googleTimeOff?.value,
      googleScheduledTime:
        !!supabaseUser?.provider?.google?.sync?.googleScheduledTime?.value,
    });
  }, [supabaseUser]);

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

  const {
    mutate: timeEntriesSync,
    isPending: isTimeEntriesSyncMutationPending,
  } = useMutation({
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

  const { mutate: scheduledTimeSync, isPending: isScheduledTimePending } =
    useMutation({
      mutationFn: ({ calendar, type }: { calendar: string; type: string }) =>
        scheduledTimeSyncMutation(
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
        form.setValue(
          "googleScheduledTime",
          !form.getValues().googleScheduledTime
        );
      },
    });

  const { mutate: timeOffSync, isPending: isTimeOffSyncPending } = useMutation({
    mutationFn: ({ calendar, type }: { calendar: string; type: string }) =>
      timeOffSyncMutation(
        jwt,
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
      form.setValue(
        "googleScheduledTime",
        !form.getValues().googleScheduledTime
      );
    },
  });

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
                    googleTimeEntry: { value: false, initialied: false },
                    googleTimeOff: { value: false, initialied: false },
                    googleScheduledTime: { value: false, initialied: false },
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
    },
    onError: (errorResponse) => console.log(errorResponse),
    onNonOAuthError: (errorResponse) => console.log(errorResponse),
  });

  const loadingArray = [
    isLoadingGoogleCalendars,
    isLoadingSupabaseUser,
    isTimeEntriesSyncMutationPending,
    isScheduledTimePending,
    isTimeOffSyncPending,
  ];

  return (
    <div className="flex flex-col items-start p-28 gap-12">
      {loadingArray.some((el) => el) ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-row gap-4 items-center">
              Google Calendar
              <Button
                onClick={
                  supabaseUser && !supabaseUser?.provider?.google?.auth
                    ? googleLogin
                    : void 0
                }
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

            <Form {...form}>
              <form className="w-full space-y-6">
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
                            scheduledTimeSync({
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
                            timeOffSync({
                              calendar: "Google",
                              type: field.name,
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          {/* <div>
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
          </div> */}
        </div>
      )}
    </div>
  );
}
