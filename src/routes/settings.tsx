import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Players & Snookers Manager" },
      { name: "description", content: "Settings for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Settings — Players & Snookers Manager" },
      { property: "og:description", content: "Settings for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="settings" />;
}
