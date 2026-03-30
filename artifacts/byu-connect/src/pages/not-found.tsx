import { Link } from "wouter";
import { AlertCircle, ArrowUpRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-4 py-16">
      <div className="connect-card w-full max-w-lg border-2 p-10 text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="h-12 w-12 text-primary" strokeWidth={2} />
        </div>
        <p className="connect-eyebrow mb-2">Error 404</p>
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          That route doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/"
          className="connect-primary-btn mt-10 inline-flex w-full justify-center sm:w-auto"
        >
          Back to Discover
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
