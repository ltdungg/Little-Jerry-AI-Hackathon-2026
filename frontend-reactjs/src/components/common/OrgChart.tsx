import { useState, useMemo } from 'react';
import type { MemberRecord, Role } from '../../types';
import { Icon } from './Icon';

interface OrgChartProps {
  members: MemberRecord[];
}

const ROLE_COLORS: Record<Role, string> = {
  leadership: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  admin: 'bg-blue-50 border-blue-200 text-blue-900',
  coordinator: 'bg-blue-50 border-blue-200 text-blue-900',
  team_lead: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  staff: 'bg-slate-50 border-slate-200 text-slate-900',
  volunteer: 'bg-slate-50 border-slate-200 text-slate-900',
};

// --- Recursive Node Component ---
function OrgNode({
  member,
  members,
  expandedIds,
  toggleExpand,
}: {
  member: MemberRecord;
  members: MemberRecord[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const children = members.filter((m) => m.managerId === member.id);
  const isExpanded = expandedIds.has(member.id);
  const colorClass = ROLE_COLORS[member.role] || ROLE_COLORS.staff;
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={`relative flex flex-col items-center p-4 border rounded-2xl w-48 shadow-sm transition-transform hover:scale-105 ${colorClass} ${hasChildren ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : ''}`}
        onClick={() => hasChildren && toggleExpand(member.id)}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-3 bg-white rounded-full shadow-sm text-sm font-bold">
          {member.initials}
        </div>
        <h3 className="text-sm font-semibold text-center truncate w-full" title={member.name}>
          {member.name}
        </h3>
        <p className="text-xs text-center opacity-80 truncate w-full mt-1" title={member.roleLabel}>
          {member.roleLabel}
        </p>
        <p className="text-[10px] text-center opacity-60 truncate w-full mt-0.5" title={member.teamName}>
          {member.teamName}
        </p>
        
        {hasChildren && (
          <div className="absolute -bottom-3 bg-white border border-slate-200 rounded-full p-0.5 shadow-sm text-slate-400 z-10 hover:text-indigo-600">
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} />
          </div>
        )}
      </div>

      {/* Children Tree */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-px h-6 bg-slate-300"></div>
          
          <div className="relative flex justify-center pt-4">
            {/* Horizontal connection line for children */}
            {children.length > 1 && (
              <div className="absolute top-0 h-px bg-slate-300" style={{ width: `calc(100% - ${12}rem)` }}></div>
            )}
            
            <div className="flex gap-4">
              {children.map((child) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  <div className="absolute -top-4 w-px h-4 bg-slate-300"></div>
                  <OrgNode
                    member={child}
                    members={members}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChart({ members }: OrgChartProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Find root members (those who don't have a manager, or their manager isn't in the list)
  const memberIds = new Set(members.map(m => m.id));
  const rootMembers = useMemo(() => {
    return members.filter(m => !m.managerId || !memberIds.has(m.managerId));
  }, [members, memberIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col items-center py-8 px-4 overflow-x-auto min-h-[60vh]">
      <div className="flex gap-8">
        {rootMembers.map((root) => (
          <OrgNode
            key={root.id}
            member={root}
            members={members}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
        {rootMembers.length === 0 && (
          <p className="text-sm text-slate-400 italic">Không có dữ liệu sơ đồ tổ chức.</p>
        )}
      </div>
    </div>
  );
}
