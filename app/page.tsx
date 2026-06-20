import { BiWine } from "react-icons/bi";
import { LuCalendarClock } from "react-icons/lu";
import { CiBoxes, CiBookmarkCheck } from "react-icons/ci";
import { VscDebugStart } from "react-icons/vsc";

export default function Home() {

  const userName = "Bar ivan"; // TODO: Replace with your actual user name
  const lastInventoryUpdate = "2023-08-15"; //TODO:  Replace with your actual last inventory update date
  const totalArticles = 150; // TODO: Replace with your actual total articles count
  const pendingArticles = 20; // TODO: Replace with your actual pending articles count

  return (
    <main className="flex flex-col gap-6 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-3">
        <div className="bg-blue-600 rounded-2xl p-2.5">
          <BiWine className="text-2xl text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Inventory</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-zinc-100">{userName}</p>
        </div>
      </div>

      {/* Iniciar inventario */}
      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex gap-4 justify-center items-center">
        <VscDebugStart className="text-xl text-blue-500" />
        <p className="text-xl font-bold text-blue-500">Start inventory</p>
      </div>

      {/* Grid de estadisticas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Último inventario */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
          <LuCalendarClock className="text-xl text-blue-500" />
          <p className="text-xs text-gray-400 dark:text-zinc-500">Last update</p>
          <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{lastInventoryUpdate}</p>
        </div>

        {/* Artículos totales */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
          <CiBoxes className="text-xl text-blue-500" />
          <p className="text-xs text-gray-400 dark:text-zinc-500">Total articles</p>
          <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{totalArticles}</p>
        </div>

        {/* Pedidos pendientes */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
          <CiBoxes className="text-xl text-orange-400" />
          <p className="text-xs text-gray-400 dark:text-zinc-500">Pending articles</p>
          <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{pendingArticles}</p>
        </div>

        {/* Último pedido */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-2">
          <CiBookmarkCheck className="text-xl text-green-500" />
          <p className="text-xs text-gray-400 dark:text-zinc-500">Last order</p>
          <p className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{pendingArticles}</p>
        </div>
      </div>
    </main>
  );
}
    