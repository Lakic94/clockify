"use client";

import React from "react";
import ProbaTest from "./proba/page";
import { GoogleOAuthProvider } from "@react-oauth/google";
import QueryTestComp from "@/components/quertTestComp";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  console.log("hello");
  const { data: supabaseUser } = useQuery({
    queryKey: ["queryTest"],
    queryFn: () => {
      console.log(123);
      return 1;
    },
    staleTime: Infinity,
    refetchInterval: false,
  });
  return (
    <GoogleOAuthProvider clientId="128986968164-fj8hgsi825motncp3aotbaurfla0hjh4.apps.googleusercontent.com">
      <div className="clockify-card cl-border-bottom cl-mb-4 h-20">
        <ProbaTest></ProbaTest>
        {/* <QueryTestComp /> */}
      </div>
    </GoogleOAuthProvider>
  );
}
