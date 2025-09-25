import { CheckCircle, AlertCircle, Clock, Building2, Target, DollarSign, Calendar, CheckSquare, Square, Star, Zap, Users, Heart, Package } from "lucide-react";
import { clsx } from "clsx";
import { ValidationResult, ChecklistItem, CompanyInfo } from "@/lib/services/projectValidationService";

interface ProjectValidationMessageProps {
  validation: ValidationResult;
  isDarkMode: boolean;
  companyInfo?: CompanyInfo;
}

export function ProjectValidationMessage({ validation, isDarkMode, companyInfo }: ProjectValidationMessageProps) {
  const getValidationIcon = () => {
    if (validation.isValidProject && validation.hasCompanyInfo) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (validation.isValidProject) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }
  };

  const getValidationStatus = () => {
    if (validation.isValidProject && validation.hasCompanyInfo) {
      return { text: "✅ Valid Project", color: "text-green-600" };
    } else if (validation.isValidProject) {
      return { text: "⚠️ Valid Project - Company Info Needed", color: "text-yellow-600" };
    } else {
      return { text: "🔄 Needs Development", color: "text-orange-600" };
    }
  };

  const status = getValidationStatus();

  return (
    <div className={clsx(
      "rounded-lg border p-4 space-y-3",
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        {getValidationIcon()}
        <div>
          <h3 className={clsx("font-semibold text-sm", status.color)}>
            {status.text}
          </h3>
          <div className="flex space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-blue-500" />
              <span className={clsx(isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Qualification: {validation.projectQualificationPotential}%
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-purple-500" />
              <span className={clsx(isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Readiness: {validation.projectDefinitionReadiness}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Criteria Assessment */}
      {validation.productVisionCriteria && (
        <div className="space-y-2">
          <h4 className={clsx("font-medium text-xs", isDarkMode ? "text-gray-300" : "text-gray-700")}>
            Product Vision Assessment:
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {validation.productVisionCriteria.vision && (
              <div className="flex items-center space-x-2">
                <Target className="w-3 h-3 text-blue-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Vision:</strong> {validation.productVisionCriteria.vision}
                </span>
              </div>
            )}
            {validation.productVisionCriteria.targetGroup && (
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-green-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Target Group:</strong> {validation.productVisionCriteria.targetGroup}
                </span>
              </div>
            )}
            {validation.productVisionCriteria.needs && (
              <div className="flex items-center space-x-2">
                <Heart className="w-3 h-3 text-red-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Needs:</strong> {validation.productVisionCriteria.needs}
                </span>
              </div>
            )}
            {validation.productVisionCriteria.product && (
              <div className="flex items-center space-x-2">
                <Package className="w-3 h-3 text-purple-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Product:</strong> {validation.productVisionCriteria.product}
                </span>
              </div>
            )}
            {validation.productVisionCriteria.businessGoals && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-3 h-3 text-yellow-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Business Goals:</strong> {validation.productVisionCriteria.businessGoals}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Info Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Building2 className={clsx("w-3 h-3", validation.hasCompanyInfo ? "text-green-500" : "text-gray-400")} />
          <span className={clsx("text-xs font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
            Company Information:
          </span>
        </div>
        {validation.hasCompanyInfo && companyInfo ? (
          <div className="ml-5 space-y-1">
            <div className="flex items-center space-x-2">
              <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                <strong>Company:</strong> {companyInfo.name}
              </span>
            </div>
            {companyInfo.employees && (
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-blue-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Employees:</strong> {companyInfo.employees}
                </span>
              </div>
            )}
            {companyInfo.nsv && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-3 h-3 text-green-500" />
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Revenue:</strong> {companyInfo.nsv}
                </span>
              </div>
            )}
            {companyInfo.country && (
              <div className="flex items-center space-x-2">
                <span className="text-xs">🌍</span>
                <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  <strong>Location:</strong> {companyInfo.country}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="ml-5">
            <span className={clsx("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
              {validation.hasCompanyInfo ? "✅ Provided" : "❌ Missing"}
            </span>
          </div>
        )}
      </div>

      {/* AI Qualification Analysis */}
      {validation.qualificationResult && (
        <div className={clsx(
          "rounded-md p-3 border-l-4",
          validation.qualificationResult.isProject 
            ? "border-green-400 bg-green-50 dark:bg-green-900/20" 
            : "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
        )}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-medium">🤖 AI Project Analysis</span>
            <span className={clsx(
              "text-xs px-2 py-1 rounded-full",
              validation.qualificationResult.confidence > 0.8 
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                : validation.qualificationResult.confidence > 0.6
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
            )}>
              {Math.round(validation.qualificationResult.confidence * 100)}% confidence
            </span>
          </div>
          <p className={clsx("text-xs", isDarkMode ? "text-gray-300" : "text-gray-700")}>
            {validation.qualificationResult.reasoning}
          </p>
        </div>
      )}

      {/* Feedback */}
      <div className={clsx("text-sm", isDarkMode ? "text-gray-300" : "text-gray-700")}>
        {validation.feedback}
      </div>

      {/* Project Completion Checklist */}
      {validation.completionChecklist && validation.completionChecklist.length > 0 && (
        <div className="space-y-3">
          <h4 className={clsx("font-medium text-sm", isDarkMode ? "text-gray-300" : "text-gray-700")}>
            📋 Project Completion Checklist
          </h4>
          {validation.completionChecklist.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-2">
              <h5 className={clsx("font-medium text-xs text-blue-600", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                {category.category}
              </h5>
              <div className="space-y-1">
                {category.items.map((item, itemIndex) => (
                  <ChecklistItemComponent 
                    key={itemIndex} 
                    item={item} 
                    isDarkMode={isDarkMode} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Steps */}
      {validation.nextSteps.length > 0 && (
        <div className="space-y-1">
          <h4 className={clsx("font-medium text-xs", isDarkMode ? "text-gray-300" : "text-gray-700")}>
            Next Steps:
          </h4>
          <ul className="space-y-1">
            {validation.nextSteps.map((step, index) => (
              <li key={index} className={clsx("text-xs flex items-start space-x-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                <span className="text-green-500 mt-0.5">→</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChecklistItemComponent({ item, isDarkMode }: { item: ChecklistItem; isDarkMode: boolean }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="flex items-start space-x-2">
      {item.completed ? (
        <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={clsx(
            "text-xs",
            item.completed 
              ? "line-through text-green-600" 
              : isDarkMode ? "text-gray-300" : "text-gray-700"
          )}>
            {item.task}
          </span>
          <span className="text-xs" title={`${item.priority} priority`}>
            {getPriorityBadge(item.priority)}
          </span>
        </div>
      </div>
    </div>
  );
}
