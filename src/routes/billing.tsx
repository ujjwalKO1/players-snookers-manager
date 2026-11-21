import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Orders — Players & Snookers Manager" },
      { name: "description", content: "Billing & Orders for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Billing & Orders — Players & Snookers Manager" },
      { property: "og:description", content: "Billing & Orders for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="billing" />;
}
