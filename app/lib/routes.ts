export interface Route {
  href: string
  label: string
  icon: "articles" | "order" | "history"
}

export const routes: Route[] = [
  { href: "/", label: "Items", icon: "articles" },
  { href: "/order", label: "Order", icon: "order" },
  { href: "/history", label: "History", icon: "history" },
]
