import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Players & Snookers Manager" },
      { name: "description", content: "Dashboard for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Dashboard — Players & Snookers Manager" },
      { property: "og:description", content: "Dashboard for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="dashboard" />;
}
