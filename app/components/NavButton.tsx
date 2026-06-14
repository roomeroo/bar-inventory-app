'use client'
import Link from "next/link";
import { Route } from "../lib/routes";
import { Package, Clipboard, Clock } from "lucide-react"
import { usePathname } from "next/navigation";


export interface NavButtonProps {
    route: Route
}

export default function NavButton({ route }: NavButtonProps ) {    
    const iconMap = { 
        inventory: Package,
        clipboard: Clipboard,
        clock: Clock,
    }
    const isActive = usePathname() === route.href
    const Icon = iconMap[route.icon]
    
    return (
       <Link href={route.href} className="flex flex-col items-center flex-1 py-3 text-xs text-gray-500 hover:text-black transition-colors" >
        <Icon className={ isActive? "text-blue-400": "" }/>
        <span className={ isActive? "text-blue-400": "" }>{ route.label }</span>
       </Link>
    )
}