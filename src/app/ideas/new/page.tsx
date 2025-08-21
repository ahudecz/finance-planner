"use client";

import { IdeaBriefForm } from "@/components/IdeaBriefForm";
import { useRouter } from "next/navigation";

export default function NewIdeaPage() {
  const router = useRouter();

  const handleSuccess = (ideaId: string) => {
    console.log("Idea created successfully:", ideaId);
    // Redirect to the new idea page
    router.push(`/ideas/${ideaId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Create New Idea
        </h1>
        <p className="text-muted-foreground">
          Fill out the company information and preferences to get started.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <IdeaBriefForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
