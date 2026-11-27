import { Loader2 } from 'lucide-react';

export default function PageLoader({ admin = false }) {
  return (
    <div className="flex justify-center py-32" role="status" aria-label="Loading">
      <Loader2 className={`h-8 w-8 animate-spin ${admin ? 'text-[#FF9A45]' : 'text-lime-500'}`} />
    </div>
  );
}
