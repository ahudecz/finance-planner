"use client";

import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Calendar,
  Sparkles
} from "lucide-react";
import { clsx } from "clsx";

interface InfoCardProps {
  number: number;
  title: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "indigo" | "purple" | "red";
  isLoading?: boolean;
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-500",
    text: "text-blue-700",
    bgLight: "bg-blue-50",
    border: "border-blue-200"
  },
  indigo: {
    bg: "bg-indigo-500", 
    text: "text-indigo-700",
    bgLight: "bg-indigo-50",
    border: "border-indigo-200"
  },
  purple: {
    bg: "bg-purple-500",
    text: "text-purple-700", 
    bgLight: "bg-purple-50",
    border: "border-purple-200"
  },
  red: {
    bg: "bg-red-500",
    text: "text-red-700",
    bgLight: "bg-red-50", 
    border: "border-red-200"
  }
};

function InfoCard({ 
  number, 
  title, 
  value, 
  icon: Icon, 
  color, 
  isLoading = false,
  onClick 
}: InfoCardProps) {
  const colors = colorClasses[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: number * 0.1 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={clsx(
        "relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg",
        colors.border,
        onClick && "hover:scale-[1.02]"
      )}
    >
      {/* Number Badge */}
      <div className={clsx(
        "absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg",
        colors.bg
      )}>
        {number}
      </div>

      {/* Icon */}
      <div className={clsx(
        "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
        colors.bgLight
      )}>
        <Icon className={clsx("w-6 h-6", colors.text)} />
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        {isLoading ? (
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
      </div>

      {/* Hover Effect */}
      <div className={clsx(
        "absolute inset-0 rounded-xl opacity-0 hover:opacity-5 transition-opacity duration-200",
        colors.bg
      )} />
    </motion.div>
  );
}

interface InfoCardsProps {
  companyName?: string;
  companySize?: string;
  capex?: number;
  opex?: number;
  timeline?: number;
  savings?: number;
  isLoading?: boolean;
  onCompanyClick?: () => void;
  onSizeClick?: () => void;
  onCapexClick?: () => void;
  onOpexClick?: () => void;
  onTimelineClick?: () => void;
  onSavingsClick?: () => void;
}

export function InfoCards({
  companyName = "Not Set",
  companySize = "Unknown",
  capex = 0,
  opex = 0,
  timeline = 0,
  savings = 0,
  isLoading = false,
  onCompanyClick,
  onSizeClick,
  onCapexClick,
  onOpexClick,
  onTimelineClick,
  onSavingsClick
}: InfoCardsProps) {
  const formatCurrency = (amount: number) => {
    if (amount === 0) return "$0";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const formatDays = (days: number) => {
    if (days === 0) return "0 days";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <InfoCard
        number={1}
        title="COMPANY"
        value={companyName}
        icon={Building2}
        color="blue"
        isLoading={isLoading}
        onClick={onCompanyClick}
      />
      
      <InfoCard
        number={2}
        title="SIZE"
        value={companySize}
        icon={Users}
        color="blue"
        isLoading={isLoading}
        onClick={onSizeClick}
      />
      
      <InfoCard
        number={3}
        title="CAPEX"
        value={formatCurrency(capex)}
        icon={DollarSign}
        color="indigo"
        isLoading={isLoading}
        onClick={onCapexClick}
      />
      
      <InfoCard
        number={3}
        title="OPEX"
        value={formatCurrency(opex)}
        icon={DollarSign}
        color="indigo"
        isLoading={isLoading}
        onClick={onOpexClick}
      />
      
      <InfoCard
        number={4}
        title="TIMELINE"
        value={formatDays(timeline)}
        icon={Calendar}
        color="purple"
        isLoading={isLoading}
        onClick={onTimelineClick}
      />
      
      <InfoCard
        number={12}
        title="SAVINGS"
        value={formatCurrency(savings)}
        icon={Sparkles}
        color="red"
        isLoading={isLoading}
        onClick={onSavingsClick}
      />
    </div>
  );
}
