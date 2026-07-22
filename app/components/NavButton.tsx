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
      <Link href={route.href} className="relative flex flex-col items-center w-full py-4 gap-1 text-sm transition-colors">
        {isActive && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        <Icon className={isActive ? "text-blue-600 dark:text-blue-400 text-2xl" : "text-gray-500 dark:text-zinc-400 text-2xl"} />
        <span className={isActive ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-zinc-400"}>{ route.label }</span>
      </Link>
    )
}