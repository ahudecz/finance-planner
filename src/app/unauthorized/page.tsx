import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have permission to access this page.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button className="w-full">
              Go to Dashboard
            </Button>
          </Link>
          
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}