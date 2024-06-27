import { createClient } from "@/lib/client";
import axiosInstance from "./axiosInterceptorInstance";

export const fetchCalendars = async (supabaseUser: any) => {
  console.log(supabaseUser);

  // return 1;
  localStorage.setItem("auth", JSON.stringify(supabaseUser.provider.google));

  const response = await axiosInstance
    .get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${supabaseUser.provider.google.access_token}`,
      },
    })
    .then((res) => {
      console.log(res);
    })
    .catch((e) => {
      console.log(e);
    });
  return response;
};

export const fetchUser = async (jwt: string) => {
  const supabase = createClient();
  console.log(jwt);
  // return 1;
  const exisitingUser = await supabase
    .from("users")
    .select()
    .eq("id", jwt as string);

  if (!exisitingUser.data?.length) {
    const createdUser = await supabase.from("users").insert({
      id: jwt as string,
      first_name: "test",
    });
    console.log(createdUser);

    const newUser = await supabase
      .from("users")
      .select()
      .eq("id", jwt as string);
    return newUser;
  }

  return exisitingUser.data[0];
  // .then(async (res) => {
  //   console.log(res);
  //   if (!res.data?.length) {
  //     console.log("no user");

  //     let a = await supabase.from("users").insert({
  //       id: jwt as string,
  //       first_name: "test",
  //     });
  //     console.log(a);
  //   }
  //   if (res.data) {
  //     setActiveUser(res?.data[0]);
  //   }
  // });
};
