"use client";

import { motion } from "framer-motion";
import { 
  Building2, 
  Users,
  Wallet, 
  Calendar,
  TrendingUp
} from "lucide-react";
import { clsx } from "clsx";
import { AgentStatusCard } from "./AgentStatusCard";

interface InfoCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const gradientClasses = {
  primary: "from-blue-500 via-blue-600 to-indigo-600",
  secondary: "from-purple-500 via-purple-600 to-pink-600",
  success: "from-emerald-500 via-emerald-600 to-teal-600",
  warning: "from-amber-500 via-orange-600 to-red-600"
};

function InfoCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  gradient,
  isLoading = false,
  onClick 
}: InfoCardProps) {
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      whileHover={{ 
        y: -2, 
        scale: 1.01,
        transition: { duration: 0.15 }
      }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-md bg-white/80 backdrop-blur-xl border border-white/20 p-2 cursor-pointer hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200"
      style={{
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {/* Background Gradient */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-200",
        gradient
      )} />
      
      {/* Header - Icon and Title on one line */}
      <div className="relative mb-1 flex items-center gap-2">
        <div className={clsx(
          "w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 flex-shrink-0",
          gradient
        )}>
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>
        <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 tracking-wide uppercase leading-tight flex-1 truncate">
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="relative">
        
        {isLoading ? (
          <div className="space-y-0.5">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded shimmer" />
            {subtitle && <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded shimmer" />}
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-0 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-200 leading-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-500" />
      </div>
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
  onBudgetClick?: () => void;
  onTimelineClick?: () => void;
  onSavingsClick?: () => void;
  // Agent status props
  agentIsActive?: boolean;
  agentCurrentStage?: string;
  agentProgress?: number;
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
  onBudgetClick,
  onTimelineClick,
  onSavingsClick,
  agentIsActive = false,
  agentCurrentStage = 'vision',
  agentProgress = 0
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
    if (days >= 7) return `${Math.ceil(days / 7)} weeks`;
    return `${days} days`;
  };

  const totalBudget = capex + (opex * 12);
  const budgetBreakdown = capex > 0 || opex > 0 ? `$${formatCurrency(capex).replace('$', '')} CAPEX + $${formatCurrency(opex * 12).replace('$', '')} OPEX/yr` : undefined;

  // Determine which cards should be visible based on data availability
  const hasCompanyData = companyName && companyName !== "Not Set" && companyName !== "Ginyard Co. (Demo)";
  const hasCompanySizeData = companySize && companySize !== "Unknown";
  const hasBudgetData = capex > 0 || opex > 0;
  const hasTimelineData = timeline > 0;
  const hasRoiData = savings > 0;

  const visibleCards = [];

  if (hasCompanyData || isLoading) {
    visibleCards.push(
      <InfoCard
        key="company"
        title="Company"
        value={companyName}
        subtitle=""
        icon={Building2}
        gradient={gradientClasses.primary}
        isLoading={isLoading}
        onClick={onCompanyClick}
      />
    );
  }

  if (hasCompanySizeData || isLoading) {
    visibleCards.push(
      <InfoCard
        key="size"
        title="Team Size"
        value={companySize}
        subtitle="employees"
        icon={Users}
        gradient={gradientClasses.primary}
        isLoading={isLoading}
        onClick={onCompanyClick}
      />
    );
  }

  if (hasBudgetData || isLoading) {
    visibleCards.push(
      <InfoCard
        key="budget"
        title="Budget"
        value={formatCurrency(totalBudget)}
        subtitle={budgetBreakdown}
        icon={Wallet}
        gradient={gradientClasses.secondary}
        isLoading={isLoading}
        onClick={onBudgetClick}
      />
    );
  }

  if (hasTimelineData || isLoading) {
    visibleCards.push(
      <InfoCard
        key="timeline"
        title="Timeline"
        value={formatDays(timeline)}
        subtitle="duration"
        icon={Calendar}
        gradient={gradientClasses.success}
        isLoading={isLoading}
        onClick={onTimelineClick}
      />
    );
  }

  if (hasRoiData || isLoading) {
    visibleCards.push(
      <InfoCard
        key="roi"
        title="ROI"
        value={formatCurrency(savings)}
        subtitle={savings > 0 && totalBudget > 0 ? `${Math.round(((savings - totalBudget) / totalBudget) * 100)}% return` : "projected"}
        icon={TrendingUp}
        gradient={gradientClasses.warning}
        isLoading={isLoading}
        onClick={onSavingsClick}
      />
    );
  }

  // Add agent status card if there are empty slots or agent is active
  const maxCards = 4;
  const shouldShowAgentCard = agentIsActive || visibleCards.length < maxCards;
  
  if (shouldShowAgentCard && visibleCards.length < maxCards) {
    visibleCards.push(
      <AgentStatusCard
        key="agent-status"
        isActive={agentIsActive}
        currentStage={agentCurrentStage}
        progress={agentProgress}
      />
    );
  }

  // If no cards are visible and not loading, show just the agent card
  if (visibleCards.length === 0 && !isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2">
        <AgentStatusCard
          isActive={agentIsActive}
          currentStage={agentCurrentStage}
          progress={agentProgress}
        />
      </div>
    );
  }

  // Dynamic grid columns based on number of visible cards
  const gridColsClass = `grid-cols-1 sm:grid-cols-${Math.min(2, visibleCards.length)} lg:grid-cols-${visibleCards.length}`;

  return (
    <div className={`grid ${gridColsClass} gap-2`}>
      {visibleCards}
    </div>
  );
}
