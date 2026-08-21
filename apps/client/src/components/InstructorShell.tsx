import { ReactNode } from 'react';
import { InstructorSidebar } from './InstructorSidebar';

export function InstructorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-100 lg:flex">
      <InstructorSidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </main>
    </div>
  );
}