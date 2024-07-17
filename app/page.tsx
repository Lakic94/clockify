import React, { Suspense } from "react";
import ProbaTest from "./proba/page";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function Home() {
  return (
    <GoogleOAuthProvider clientId={"128986968164-fj8hgsi825motncp3aotbaurfla0hjh4.apps.googleusercontent.com"}>
      <div className="clockify-card cl-border-bottom cl-mb-4 h-20">
        <ProbaTest />
      </div>
    </GoogleOAuthProvider>
  );
}
