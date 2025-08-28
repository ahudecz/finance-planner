"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  BarChart3, 
  Briefcase, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  PieChart
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { useAuth } from "@/lib/services/authService";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Charts", href: "/charts", icon: PieChart },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { profile, user, isAuthenticated, isLoading } = useAuth();
  
  

  return (
    <motion.div
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={clsx(
        "bg-white/80 backdrop-blur-xl border-r border-white/20 flex flex-col h-screen relative",
        className
      )}
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Finance Planner
            </span>
          )}
        </motion.div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-white/50 backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/dashboard" && pathname === "/");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200/50 shadow-sm"
                  : "text-gray-600 hover:bg-white/50 hover:text-gray-900 hover:shadow-sm"
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-blue-600" : "text-gray-400"
              )} />
              
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  "truncate",
                  isCollapsed && "sr-only"
                )}
              >
                {item.name}
              </motion.span>
              
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="w-2 h-2 bg-blue-600 rounded-full ml-auto"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs font-medium text-white">
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : profile?.email ? profile.email.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "flex-1 min-w-0",
              isCollapsed && "sr-only"
            )}
          >
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.fullName || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || (isAuthenticated ? 'Loading...' : 'Guest User')}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500 truncate">
                {profile?.email || user?.email || (isAuthenticated ? 'Loading...' : 'Please sign in')}
              </p>
              {profile?.role && (
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded capitalize font-medium">
                  {profile.role}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
