import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Players & Snookers Manager" },
      { name: "description", content: "Expenses for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Expenses — Players & Snookers Manager" },
      { property: "og:description", content: "Expenses for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="expenses" />;
}
