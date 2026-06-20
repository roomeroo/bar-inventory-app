'use client'
import Link from "next/link";
import { Route } from "../lib/routes";
import { CiBoxList, CiShop } from "react-icons/ci";
import { MdHistory } from "react-icons/md";

import { usePathname } from "next/navigation";


export interface NavButtonProps {
    route: Route
}

export default function NavButton({ route }: NavButtonProps ) {    
    const iconMap = { 
        inventory: CiBoxList,
        order: CiShop,
        history: MdHistory,
    }
    const isActive = usePathname() === route.href
    const Icon = iconMap[route.icon]
    
    return (
      <Link href={route.href} className="relative flex flex-col items-center w-full py-3 gap-0.5 text-xs transition-colors">
        {isActive && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />}
        <Icon className={isActive ? "text-blue-500 text-2xl" : "text-gray-400 dark:text-zinc-500 text-2xl"} />
        <span className={isActive ? "text-blue-500 font-semibold" : "text-gray-400 dark:text-zinc-500"}>{ route.label }</span>
      </Link>
    )
}