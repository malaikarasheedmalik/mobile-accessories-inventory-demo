import { Suspense } from 'react';
import AssistantClient from './AssistantClient';

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="card flex items-center justify-center p-16 text-[13px] text-slate-400">Loading assistant...</div>
      }
    >
      <AssistantClient />
    </Suspense>
  );
}