import {
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  ScrollText,
  Users as UsersIcon,
  Truck,
  UserCog,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { initials } from "@/lib/utils";

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const menuItems = [
    { name: t("nav.pos"), icon: LayoutDashboard, path: "/pos" },
    { name: t("nav.products"), icon: Package, path: "/products" },
    { name: t("nav.salesHistory"), icon: ReceiptText, path: "/salesHistory" },
    { name: t("nav.achats"), icon: ShoppingCart, path: "/achats" },
    { name: t("nav.achatsHistory"), icon: ScrollText, path: "/achatsHistory" },
    { name: t("nav.clients"), icon: UsersIcon, path: "/clients" },
    { name: t("nav.fournisseurs"), icon: Truck, path: "/fournisseurs" },
    { name: t("nav.users"), icon: UserCog, path: "/users" },
    { name: t("nav.settings"), icon: Settings, path: "/settings" },
    { name: t("nav.statistic"), icon: BarChart3, path: "/statistic" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={`flex h-screen flex-col bg-gradient-to-br from-teal-50 to-teal-100 shadow text-white p-3 pt-5 transition-all duration-300 ${
        open ? "w-[15vw] min-w-[220px]" : "w-[5vw] min-w-[76px]"
      }`}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="grid h-8 w-8 place-items-center rounded bg-teal-500 text-white font-bold">
            M
          </div>
          {open && <span className="font-bold text-lg text-black">MyBrand</span>}
        </div>

        {open ? (
          <ChevronLeft className="cursor-pointer text-slate-600" onClick={() => setOpen(false)} />
        ) : (
          <Menu className="cursor-pointer text-slate-600" onClick={() => setOpen(true)} />
        )}
      </div>

      {/* Menu */}
      <ul className="mt-10 flex-1 space-y-2 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              to={item.path}
              key={index}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-2 py-3 rounded-xl text-md cursor-pointer font-medium ${
                  isActive ? "bg-teal-200 text-black" : "hover:bg-teal-100 hover:text-black text-gray-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-black" : "group-hover:text-black"
                    } text-black`}
                    size={17}
                  />
                  {open && <span className="truncate">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </ul>

      {/* Footer — current user + logout */}
      <div className="mt-2 border-t border-teal-200/70 pt-3">
        <div className={`flex items-center gap-2 rounded-xl bg-white/60 p-2 ${open ? "" : "justify-center"}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-500 text-xs font-bold text-white">
            {initials(user?.nom)}
          </span>
          {open && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.nom ?? t("common.user")}</p>
              <p className="truncate text-xs text-slate-500">
                {user?.role ? t(`role.${user.role}`) : ""}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={t("nav.logout")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
