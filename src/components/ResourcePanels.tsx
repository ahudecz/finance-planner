"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  UserCheck, 
  Clock, 
  DollarSign,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { clsx } from "clsx";

interface Resource {
  id: string;
  title: string;
  duration: number; // in days
  cost?: number; // per day for external resources
  description?: string;
}

interface ResourcePanelProps {
  number: number;
  title: string;
  icon: React.ElementType;
  resources: Resource[];
  isLoading?: boolean;
  onAddResource?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: string) => void;
  className?: string;
}

function ResourcePanel({
  number,
  title,
  icon: Icon,
  resources,
  isLoading = false,
  onAddResource,
  onEditResource,
  onDeleteResource,
  className
}: ResourcePanelProps) {
  const totalDays = resources.reduce((sum, resource) => sum + resource.duration, 0);
  const totalCost = resources.reduce((sum, resource) => {
    return sum + (resource.cost ? resource.cost * resource.duration : 0);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: number * 0.1 }}
      className={clsx(
        "bg-white rounded-xl border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-indigo-50 p-4 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{number}</span>
            </div>
            <div>
              <h3 className="font-semibold text-indigo-900">{title}</h3>
              <div className="flex items-center space-x-4 text-sm text-indigo-600">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{totalDays} days</span>
                </span>
                {totalCost > 0 && (
                  <span className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                    <span>${totalCost.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Icon className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8">
            <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No resources added yet</p>
            <button
              onClick={onAddResource}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
                className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {resource.title}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{resource.duration} day{resource.duration !== 1 ? 's' : ''}</span>
                    </span>
                    {resource.cost && (
                      <span className="text-sm text-gray-500 flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>${resource.cost}/day</span>
                      </span>
                    )}
                  </div>
                  {resource.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {resource.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditResource?.(resource)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteResource?.(resource.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}

            <button
              onClick={onAddResource}
              className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Resource</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ResourcePanelsProps {
  internalResources?: Resource[];
  externalResources?: Resource[];
  isLoading?: boolean;
  onAddInternal?: () => void;
  onAddExternal?: () => void;
  onEditInternal?: (resource: Resource) => void;
  onEditExternal?: (resource: Resource) => void;
  onDeleteInternal?: (resourceId: string) => void;
  onDeleteExternal?: (resourceId: string) => void;
}

export function ResourcePanels({
  internalResources = [],
  externalResources = [],
  isLoading = false,
  onAddInternal,
  onAddExternal,
  onEditInternal,
  onEditExternal,
  onDeleteInternal,
  onDeleteExternal
}: ResourcePanelsProps) {
  // Mock data for demonstration
  const mockInternalResources: Resource[] = internalResources.length > 0 ? internalResources : [
    {
      id: "int-1",
      title: "Subject Matter Expert",
      duration: 5,
      description: "Technical oversight and requirements validation"
    },
    {
      id: "int-2", 
      title: "Project Manager",
      duration: 15,
      description: "End-to-end project coordination"
    }
  ];

  const mockExternalResources: Resource[] = externalResources.length > 0 ? externalResources : [
    {
      id: "ext-1",
      title: "AI Consultant", 
      duration: 9,
      cost: 500,
      description: "Machine learning implementation specialist"
    },
    {
      id: "ext-2",
      title: "UI/UX Designer",
      duration: 7,
      cost: 350,
      description: "User interface design and prototyping"
    }
  ];

  return (
    <div className="space-y-4">
      <ResourcePanel
        number={5}
        title="INTERNAL RESOURCES"
        icon={Users}
        resources={mockInternalResources}
        isLoading={isLoading}
        onAddResource={onAddInternal}
        onEditResource={onEditInternal}
        onDeleteResource={onDeleteInternal}
      />
      
      <ResourcePanel
        number={6}
        title="EXTERNAL RESOURCES"
        icon={UserCheck}
        resources={mockExternalResources}
        isLoading={isLoading}
        onAddResource={onAddExternal}
        onEditResource={onEditExternal}
        onDeleteResource={onDeleteExternal}
      />
    </div>
  );
}
