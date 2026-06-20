

export interface Route {
  href: string
  label: string
  icon: "inventory" | "order" | "history"
}

export const routes: Route[] = [ 
  {  href: "/", label: "Inventory", icon: "inventory" },
  {  href: "/order", label: "Order", icon: "order" },
  {  href: "/history", label: "History", icon: "history" }
]