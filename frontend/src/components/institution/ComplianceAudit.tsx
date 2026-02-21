import { Card } from '../ui/Card';
import { ShieldCheck } from 'lucide-react';

export function ComplianceAudit() {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold">Compliance audit trail</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
            <th className="pb-2">Action</th>
            <th className="pb-2">Timestamp</th>
            <th className="pb-2">On-chain</th>
          </tr>
        </thead>
        <tbody className="text-text-secondary">
          <tr className="border-t border-slate-700/50">
            <td className="py-2">Profile generated</td>
            <td className="py-2">{new Date().toISOString().slice(0, 10)}</td>
            <td className="py-2 text-success">Verified</td>
          </tr>
          <tr className="border-t border-slate-700/50">
            <td className="py-2">Share token accessed</td>
            <td className="py-2">{new Date().toISOString().slice(0, 10)}</td>
            <td className="py-2 text-slate-500">N/A</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
