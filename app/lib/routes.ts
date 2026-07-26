export interface Route {
  href: string
  label: string
  icon: "articles" | "order" | "history"
}

export const routes: Route[] = [
  { href: "/", label: "Artículos", icon: "articles" },
  { href: "/order", label: "Pedido", icon: "order" },
  { href: "/history", label: "Historial", icon: "history" },
]
