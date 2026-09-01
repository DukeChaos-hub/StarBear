'use client';
import { useEffect, useState } from 'react';

interface Environment {
  id: string;
  name: string;
  is_active: number;
}

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<Environment[]>([]);
  useEffect(() => {
    fetch('/api/environments')
      .then((r) => r.json())
      .then((d) => setEnvs(d as Environment[]));
  }, []);
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Environments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {envs.length} configured · {envs.filter((e) => e.is_active === 1).length} active
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Full env editor ships in Phase 8. Use <code>pnpm db:seed</code> to populate sample data.
      </p>
    </div>
  );
}
