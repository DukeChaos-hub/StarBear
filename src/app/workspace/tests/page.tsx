'use client';
import { useEffect, useState } from 'react';

interface TestCase {
  id: string;
  name: string;
  description: string | null;
}

export default function TestsPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  useEffect(() => {
    fetch('/api/test-cases')
      .then((r) => r.json())
      .then((d) => setCases(d as TestCase[]));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Tests</h1>
      <p className="mt-1 text-sm text-muted-foreground">{cases.length} test cases</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Run/report UI ships in Phase 8. The backend is ready: <code>POST /api/tests</code> +{' '}
        <code>POST /api/tests/suite</code>.
      </p>
    </div>
  );
}
