import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/new-session")({
  head: () => ({
    meta: [
      { title: "New Session — Players & Snookers Manager" },
      { name: "description", content: "New Session for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "New Session — Players & Snookers Manager" },
      { property: "og:description", content: "New Session for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="new-session" />;
}
