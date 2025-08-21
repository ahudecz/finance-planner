import { Badge } from "@/components/ui/Badge";
import { RisksPanel } from "@/components/RisksPanel";
import { Company, OrgSize } from "@/types/domain";
import { getCompany, getOrgSize } from "@/lib/brief";
import { createServerClient } from "@/lib/supabase/server";

// Data structure from Supabase
interface IdeaData {
  id: string;
  briefJson: Record<string, unknown>;
  // Computed fields from brief_json
  company?: Company;
  orgSize: OrgSize;
}

// Fetch idea data from Supabase
async function getIdeaData(id: string): Promise<IdeaData | null> {
  try {
    const supabase = await createServerClient();
    const { data: idea, error } = await supabase
      .from('ideas')
      .select('id, brief_json')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching idea:', error);
      return null;
    }

    if (!idea) {
      return null;
    }

    // Extract company and org size from brief_json using helpers
    const company = getCompany(idea.brief_json);
    const orgSize = getOrgSize(idea.brief_json);

    return {
      id: idea.id,
      briefJson: idea.brief_json || {},
      company,
      orgSize,
    };
  } catch (error) {
    console.error('Error fetching idea data:', error);
    return null;
  }
}

interface IdeaPageProps {
  params: Promise<{ id: string }>;
}

export default async function IdeaPage({ params }: IdeaPageProps) {
  const { id } = await params;
  const idea = await getIdeaData(id);

  if (!idea) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Idea Not Found</h1>
          <p className="text-muted-foreground">The requested idea could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold text-foreground">
            {idea.company?.name || "Unknown Company"}
          </h1>
          <Badge variant="secondary" className="text-sm">
            {idea.orgSize}
          </Badge>
          {idea.company?.privacyRedaction && (
            <Badge variant="destructive" className="text-sm">
              Redacted
            </Badge>
          )}
        </div>
        
        {idea.company?.domain && (
          <p className="text-muted-foreground">
            Domain: {idea.company.domain}
          </p>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          <button className="border-b-2 border-primary text-primary py-2 px-1 font-medium">
            Overview
          </button>
          <button className="border-b-2 border-transparent text-muted-foreground hover:text-foreground py-2 px-1">
            Details
          </button>
          <button className="border-b-2 border-transparent text-muted-foreground hover:text-foreground py-2 px-1">
            Analysis
          </button>
          <button className="border-b-2 border-transparent text-muted-foreground hover:text-foreground py-2 px-1">
            Risks
          </button>
        </nav>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Idea Overview</h2>
            <p className="text-muted-foreground">
              This is where the main idea content would be displayed.
              The idea brief and analysis would appear here.
            </p>
          </div>
        </div>

        {/* Sidebar with Risks Panel */}
        <div className="space-y-6">
          <RisksPanel ideaId={idea.id} />
          
          {/* Additional panels can go here */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company Size:</span>
                <span>{idea.orgSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Privacy Mode:</span>
                <span>{idea.company?.privacyRedaction ? "Enabled" : "Disabled"}</span>
              </div>
              {idea.company?.linkedinUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LinkedIn:</span>
                  <a 
                    href={idea.company.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    View Profile
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
