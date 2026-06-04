"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Pencil } from "lucide-react"
import type { Todo } from "@/lib/types"

interface PlannerTaskCardProps {
  todo: Todo
  companionName?: string
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
  /** Overdue cards are draggable but rendered with a warning tint. */
  overdue?: boolean
}

export default function PlannerTaskCard({ todo, companionName, onToggle, onEdit, overdue }: PlannerTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`cb-${todo.id}`}
      className={`flex items-center gap-2 rounded-lg p-2 ${
        overdue ? "bg-red-950/40 border border-red-800/40" : "bg-gray-800/60"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-500 hover:text-gray-300"
        aria-label="Drag task"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() =>
          onToggle(todo.id, typeof document !== "undefined" ? document.getElementById(`cb-${todo.id}`) : null)
        }
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${todo.completed ? "line-through text-gray-500" : "text-white"}`}>
          {todo.text}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700 px-1 py-0">{todo.category}</Badge>
          {companionName && (
            <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-700/50 px-1 py-0">{companionName}</Badge>
          )}
        </div>
      </div>
      <button onClick={() => onEdit(todo)} className="text-gray-500 hover:text-white p-1" aria-label="Edit task">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
