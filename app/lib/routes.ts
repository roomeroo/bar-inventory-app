

export interface Route {
  href: string
  label: string
  icon: "inventory" | "clipboard" | "clock"
}

export const routes: Route[] = [ 
  {  href: "/", label: "Inventory", icon: "inventory" },
  {  href: "/order", label: "Order", icon: "clipboard" },
  {  href: "/history", label: "History", icon: "clock" }
]