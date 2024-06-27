"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function QueryTestComp() {
  //   console.log("rerender loop");

  //   const { data: supabaseUser } = useQuery({
  //     queryKey: ["queryTest"],
  //     queryFn: () => {
  //       console.log(123);
  //       return 1;
  //     },
  //     // staleTime: Infinity,
  //   });
  //   console.log(supabaseUser);
  useEffect(() => {
    console.log("1");
  });

  return <div>Test</div>;
}
