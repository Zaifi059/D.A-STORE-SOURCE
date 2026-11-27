import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex justify-center py-32" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
    </div>
  );
}
