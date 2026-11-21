import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Gaming Sessions — Players & Snookers Manager" },
      { name: "description", content: "Gaming Sessions for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Gaming Sessions — Players & Snookers Manager" },
      { property: "og:description", content: "Gaming Sessions for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="sessions" />;
}
