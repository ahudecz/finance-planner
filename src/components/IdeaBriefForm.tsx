"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { ExternalLink } from "lucide-react";
import { Company, OrgSize } from "@/types/domain";
import { companySchema, orgSizeSchema } from "@/schemas";
import { supabase } from "@/lib/supabase/client";
import { createBriefJson } from "@/lib/brief";

interface IdeaBriefFormData {
  company: Company;
  orgSize: OrgSize;
}

interface IdeaBriefFormProps {
  onSubmit?: (data: IdeaBriefFormData) => void;
  onSuccess?: (ideaId: string) => void;
  initialData?: Partial<IdeaBriefFormData>;
  projectId?: string; // If provided, save to this project
}

const SIZE_BAND_OPTIONS = [
  { value: "<20" as const, label: "< 20 employees" },
  { value: "20–200" as const, label: "20–200 employees" },
  { value: "200–1k" as const, label: "200–1k employees" },
  { value: "1k–10k" as const, label: "1k–10k employees" },
  { value: ">10k" as const, label: "> 10k employees" },
  { value: "Unknown" as const, label: "Unknown" },
];

export function IdeaBriefForm({ onSubmit, onSuccess, initialData, projectId }: IdeaBriefFormProps) {
  const [formData, setFormData] = useState<IdeaBriefFormData>({
    company: {
      name: initialData?.company?.name || "",
      domain: initialData?.company?.domain || "",
      linkedinUrl: initialData?.company?.linkedinUrl || "",
      privacyRedaction: initialData?.company?.privacyRedaction || false,
    },
    orgSize: initialData?.orgSize || "Unknown",
  });

  const [isEnrichmentLoading, setIsEnrichmentLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompanyNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      company: { ...prev.company, name },
    }));
  };

  const handleCompanyDomainChange = (domain: string) => {
    setFormData((prev) => ({
      ...prev,
      company: { ...prev.company, domain },
    }));
  };

  const handleCompanyLinkedinChange = (linkedinUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      company: { ...prev.company, linkedinUrl },
    }));
  };

  const handleSizeBandChange = (orgSize: OrgSize) => {
    setFormData((prev) => ({ ...prev, orgSize }));
  };

  const handlePrivacyToggle = (privacyRedaction: boolean) => {
    setFormData((prev) => ({
      ...prev,
      company: { ...prev.company, privacyRedaction },
    }));
  };

  const handleFindSize = async () => {
    if (!formData.company.name.trim()) return;
    
    setIsEnrichmentLoading(true);
    try {
      console.log("🔍 Finding size for company:", formData.company.name);
      
      const response = await fetch('/api/enrich/org-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          company: formData.company 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Enrichment failed: ${response.status}`);
      }
      
      const enrichmentResult = await response.json();
      console.log("📊 Enrichment result:", enrichmentResult);
      
      // Update size band if we got a non-Unknown result
      if (enrichmentResult.sizeBand && enrichmentResult.sizeBand !== "Unknown") {
        setFormData((prev) => ({ 
          ...prev, 
          orgSize: enrichmentResult.sizeBand 
        }));
        
        // Show success message (you could add a toast here)
        console.log(`✅ Updated size to: ${enrichmentResult.sizeBand} (source: ${enrichmentResult.source})`);
      } else {
        // Show info about why enrichment couldn't determine size
        console.log(`ℹ️ Could not determine size: ${enrichmentResult.notes || 'No data available'}`);
      }
      
    } catch (error) {
      console.error("❌ Error enriching company data:", error);
      // You could show an error toast here
    } finally {
      setIsEnrichmentLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate form data using individual schemas
    const companyResult = companySchema.safeParse(formData.company);
    const orgSizeResult = orgSizeSchema.safeParse(formData.orgSize);
    
    const errors: Record<string, string> = {};
    
    if (!companyResult.success) {
      companyResult.error.errors.forEach((error) => {
        const path = `company.${error.path.join('.')}`;
        errors[path] = error.message;
      });
    }
    
    if (!orgSizeResult.success) {
      orgSizeResult.error.errors.forEach((error) => {
        const path = error.path.join('.') || 'orgSize';
        errors[path] = error.message;
      });
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Clear validation errors
    setValidationErrors({});
    setIsSubmitting(true);
    
    try {
      // Call the legacy onSubmit callback if provided
      if (onSubmit) {
        onSubmit(formData);
        return;
      }
      
      // Save to Supabase
      const briefJson = createBriefJson(companyResult.data!, orgSizeResult.data!);
      
      // First, create or get a project if projectId is not provided
      let targetProjectId = projectId;
      if (!targetProjectId) {
        // Create a new project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            title: `${companyResult.data!.name} Analysis`,
            status: 'active'
          })
          .select('id')
          .single();
          
        if (projectError) {
          console.error('Error creating project:', projectError);
          throw new Error('Failed to create project');
        }
        
        targetProjectId = project.id;
      }
      
      // Save the idea with brief_json
      const { data: idea, error: ideaError } = await supabase
        .from('ideas')
        .insert({
          project_id: targetProjectId,
          brief_json: briefJson
        })
        .select('id')
        .single();
        
      if (ideaError) {
        console.error('Error saving idea:', ideaError);
        throw new Error('Failed to save idea');
      }
      
      console.log('Idea saved successfully:', idea.id);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(idea.id);
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // You might want to show an error message to the user here
      setValidationErrors({
        submit: error instanceof Error ? error.message : 'Failed to save idea'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          #1 Company Information
        </h3>
        
        <div className="space-y-3">
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-foreground mb-1">
              Company Name *
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="company-name"
                type="text"
                value={formData.company.name}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="Enter company name"
                required
                className="flex-1"
              />
              {formData.company.name.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFindSize}
                  disabled={isEnrichmentLoading}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {isEnrichmentLoading ? "Finding..." : "Find size"}
                </Button>
              )}
            </div>
            {validationErrors['company.name'] && (
              <p className="text-sm text-destructive mt-1">{validationErrors['company.name']}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-domain" className="block text-sm font-medium text-foreground mb-1">
              Company Domain
            </label>
            <Input
              id="company-domain"
              type="text"
              value={formData.company.domain || ""}
              onChange={(e) => handleCompanyDomainChange(e.target.value)}
              placeholder="example.com"
            />
            {validationErrors['company.domain'] && (
              <p className="text-sm text-destructive mt-1">{validationErrors['company.domain']}</p>
            )}
          </div>

          <div>
            <label htmlFor="company-linkedin" className="block text-sm font-medium text-foreground mb-1">
              LinkedIn URL
            </label>
            <Input
              id="company-linkedin"
              type="url"
              value={formData.company.linkedinUrl || ""}
              onChange={(e) => handleCompanyLinkedinChange(e.target.value)}
              placeholder="https://linkedin.com/company/..."
            />
            {validationErrors['company.linkedinUrl'] && (
              <p className="text-sm text-destructive mt-1">{validationErrors['company.linkedinUrl']}</p>
            )}
          </div>
        </div>
      </div>

      {/* Size Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          #2 Company Size
        </h3>
        
        <div>
          <label htmlFor="size-band" className="block text-sm font-medium text-foreground mb-1">
            Size Band
          </label>
          <Select
            value={formData.orgSize}
            onValueChange={handleSizeBandChange}
            options={SIZE_BAND_OPTIONS}
            placeholder="Select company size"
          />
          {validationErrors.orgSize && (
            <p className="text-sm text-destructive mt-1">{validationErrors.orgSize}</p>
          )}
        </div>
      </div>

      {/* Privacy Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="privacy-redaction" className="block text-sm font-medium text-foreground">
              Privacy Redaction
            </label>
            <p className="text-xs text-muted-foreground">
              Enable to redact sensitive information in reports
            </p>
          </div>
          <Toggle
            id="privacy-redaction"
            checked={formData.company.privacyRedaction || false}
            onCheckedChange={handlePrivacyToggle}
          />
        </div>
      </div>

      {/* Submit Error */}
      {validationErrors.submit && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-sm text-destructive">{validationErrors.submit}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="px-6">
          {isSubmitting ? "Saving..." : "Save Brief"}
        </Button>
      </div>
    </form>
  );
}
