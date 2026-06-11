export interface Route {
  path: string
  label: string
  icon?: string
}

export const routes: Route[] = [ 
    {  path: "/", label: "Inventory", icon: "inventory" },
    {  path: "/order", label: "Order", icon: "clipboard" },
    {  path: "/history", label: "History", icon: "clock" }
]
