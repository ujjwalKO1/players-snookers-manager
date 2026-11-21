import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/ManagerApp";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & Pricing — Players & Snookers Manager" },
      { name: "description", content: "Products & Pricing for the Players & Snookers gaming and snooker lounge." },
      { property: "og:title", content: "Products & Pricing — Players & Snookers Manager" },
      { property: "og:description", content: "Products & Pricing for the Players & Snookers gaming and snooker lounge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return <ManagerApp page="products" />;
}
