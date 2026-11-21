import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — Players & Snookers Manager" },
      { name: "description", content: "Reports & Analytics for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Reports & Analytics — Players & Snookers Manager" },
      { property: "og:description", content: "Reports & Analytics for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="reports" />;
}
