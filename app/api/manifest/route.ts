import { NextResponse } from "next/server";

const baseUrl = "https://herring-endless-firmly.ngrok-free.app";
export async function GET(request: Request) {
  console.log(request);

  let data = {
    schemaVersion: "1.2",
    key: "calendar",
    name: "Calendar Integration",
    description: "Example of every UI entrypoint for an addon",
    baseUrl: baseUrl,
    lifecycle: [
      {
        type: "INSTALLED",
        path: "api/lifecycle/installed",
      },
      {
        type: "DELETED",
        path: "/lifecycle/uninstalled",
      },
      {
        type: "SETTINGS_UPDATED",
        path: "/lifecycle/settings-updated",
      },
    ],
    webhooks: [
      {
        event: "NEW_TIME_ENTRY",
        path: "/api/webhook/time-entry",
      },
      {
        event: "NEW_TASK",
        path: "/clockify",
      },
    ],
    components: [
      {
        type: "sidebar",
        accessLevel: "EVERYONE",
        path: "/",
        label: "Sidebar",
        iconPath: "tab_icon.svg",
      },
      {
        type: "widget",
        accessLevel: "ADMINS",
        path: "/clockify",
        label: "WIDGET",
        iconPath: "tab_icon.svg",
      },
    ],
    settings: {
      tabs: [
        {
          id: "Tab id",
          name: "Tab one title",
          header: {
            title: "Title text",
          },
          settings: [
            {
              id: "Time Off",
              name: "Time Off",
              accessLevel: "ADMINS",
              type: "CHECKBOX",
              value: true,
            },
            {
              id: "Scheduling",
              name: "Scheduling",
              accessLevel: "ADMINS",
              type: "CHECKBOX",
              allowedValues: ["Time Off", "Scheduling", "Time entry"],
              value: false,
            },
            {
              id: "Time entry",
              name: "Time entry",
              accessLevel: "ADMINS",
              type: "CHECKBOX",
              allowedValues: ["Time Off", "Scheduling", "Time entry"],
              value: false,
            },
          ],
        },
      ],
    },
    minimalSubscriptionPlan: "FREE",
    scopes: [
      "CLIENT_READ",
      "CLIENT_WRITE",
      "PROJECT_READ",
      "PROJECT_WRITE",
      "TAG_READ",
      "TAG_WRITE",
      "TASK_READ",
      "TASK_WRITE",
      "TIME_ENTRY_READ",
      "TIME_ENTRY_WRITE",
      "EXPENSE_READ",
      "EXPENSE_WRITE",
      "INVOICE_READ",
      "INVOICE_WRITE",
      "USER_READ",
      "USER_WRITE",
      "GROUP_READ",
      "GROUP_WRITE",
      "WORKSPACE_READ",
      "WORKSPACE_WRITE",
      "CUSTOM_FIELDS_READ",
      "CUSTOM_FIELDS_WRITE",
      "APPROVAL_READ",
      "APPROVAL_WRITE",
      "SCHEDULING_READ",
      "SCHEDULING_WRITE",
      "REPORTS_READ",
      "REPORTS_WRITE",
      "TIME_OFF_READ",
      "TIME_OFF_WRITE",
    ],
  };

  return NextResponse.json(data);
}
