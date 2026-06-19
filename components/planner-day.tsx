"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import PlannerTaskCard from "./planner-task-card"
import type { Todo } from "@/lib/types"

interface PlannerDayProps {
  containerId: string
  title: string
  subtitle?: string
  todos: Todo[]
  highlight?: boolean
  overdue?: boolean
  droppable?: boolean
  companionName: (id?: number) => string | undefined
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
}

export default function PlannerDay({
  containerId, title, subtitle, todos, highlight, overdue, droppable = true, companionName, onToggle, onEdit,
}: PlannerDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: containerId, disabled: !droppable })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 min-h-[96px] transition-colors ${
        highlight ? "border-purple-500/60 bg-gray-900" : overdue ? "border-red-800/50 bg-gray-900" : "border-gray-800 bg-gray-900"
      } ${isOver && droppable ? "ring-2 ring-purple-500/60" : ""}`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-xs font-bold ${highlight ? "text-purple-300" : overdue ? "text-red-300" : "text-gray-400"}`}>{title}</span>
        {subtitle && <span className="text-[10px] text-gray-500">{subtitle}</span>}
      </div>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {todos.map((t) => (
            <PlannerTaskCard
              key={t.id}
              todo={t}
              companionName={companionName(t.assignedCharacterId)}
              onToggle={onToggle}
              onEdit={onEdit}
              overdue={overdue}
            />
          ))}
          {todos.length === 0 && <p className="text-[11px] text-gray-600 py-2 text-center">—</p>}
        </div>
      </SortableContext>
    </div>
  )
}
