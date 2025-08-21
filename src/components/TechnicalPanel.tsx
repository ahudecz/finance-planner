"use client";

import { motion } from "framer-motion";
import { 
  Monitor, 
  Server, 
  Database, 
  Shield,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { clsx } from "clsx";

interface TechnicalRequirement {
  id: string;
  title: string;
  type: "hardware" | "software" | "security" | "infrastructure";
  description?: string;
  quantity?: number;
  status: "required" | "recommended" | "optional";
}

interface TechnicalPanelProps {
  requirements?: TechnicalRequirement[];
  isLoading?: boolean;
  onAddRequirement?: () => void;
  onEditRequirement?: (requirement: TechnicalRequirement) => void;
  onDeleteRequirement?: (requirementId: string) => void;
  className?: string;
}

const getTypeIcon = (type: TechnicalRequirement['type']) => {
  switch (type) {
    case 'hardware': return Monitor;
    case 'software': return Server;
    case 'security': return Shield;
    case 'infrastructure': return Database;
    default: return Monitor;
  }
};

const getStatusColor = (status: TechnicalRequirement['status']) => {
  switch (status) {
    case 'required': return 'bg-red-100 text-red-800';
    case 'recommended': return 'bg-yellow-100 text-yellow-800';
    case 'optional': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function TechnicalPanel({
  requirements = [],
  isLoading = false,
  onAddRequirement,
  onEditRequirement,
  onDeleteRequirement,
  className
}: TechnicalPanelProps) {
  // Mock data for demonstration
  const mockRequirements: TechnicalRequirement[] = requirements.length > 0 ? requirements : [
    {
      id: "tech-1",
      title: "Standalone PC",
      type: "hardware",
      description: "High-performance workstation for development",
      quantity: 1,
      status: "required"
    },
    {
      id: "tech-2", 
      title: "AI SSO Installation",
      type: "software",
      description: "Single Sign-On integration with AI services",
      quantity: 1,
      status: "required"
    },
    {
      id: "tech-3",
      title: "Cloud Database",
      type: "infrastructure", 
      description: "PostgreSQL database with backup",
      quantity: 1,
      status: "recommended"
    },
    {
      id: "tech-4",
      title: "SSL Certificate",
      type: "security",
      description: "Wildcard SSL for domain security",
      quantity: 1,
      status: "required"
    }
  ];

  const displayRequirements = mockRequirements;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className={clsx(
        "bg-white rounded-xl border border-gray-200 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-green-50 p-4 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">8</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">TECHNICAL REQUIREMENTS</h3>
              <p className="text-sm text-green-600">
                {displayRequirements.length} requirement{displayRequirements.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Monitor className="w-6 h-6 text-green-600" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : displayRequirements.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No technical requirements added yet</p>
            <button
              onClick={onAddRequirement}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Requirement</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayRequirements.map((requirement, index) => {
              const IconComponent = getTypeIcon(requirement.type);
              
              return (
                <motion.div
                  key={requirement.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {requirement.title}
                        </h4>
                        {requirement.quantity && requirement.quantity > 1 && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                            x{requirement.quantity}
                          </span>
                        )}
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          getStatusColor(requirement.status)
                        )}>
                          {requirement.status}
                        </span>
                      </div>
                      
                      {requirement.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {requirement.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 capitalize mt-1">
                        {requirement.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditRequirement?.(requirement)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteRequirement?.(requirement.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            <button
              onClick={onAddRequirement}
              className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Requirement</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
