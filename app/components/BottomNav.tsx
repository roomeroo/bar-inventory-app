import { usePathname } from "next/navigation";
import { Route } from "../lib/routes";

export default function BottomNav(route: Route) {
    const path = usePathname();
    return (
       <button>
        {route.label}
       </button>
    )
}