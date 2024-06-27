"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendDiscordMessage } from "../api/webhook/_actions";

export default async function Event() {
  await sendDiscordMessage("Hello World!");
  console.log(localStorage.getItem("auth"));

  return null;
}
