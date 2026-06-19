"use client"

import { useMemo, useState } from "react"
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Menu } from "lucide-react"
import PlannerDay from "./planner-day"
import { WEEKDAY_LABELS, weekStartIso, weekDays, groupTodosForWeek, partitionUnscheduledOverdue } from "@/lib/planner"
import { addDaysIso, todayIso } from "@/lib/date-utils"
import type { Character, Todo } from "@/lib/types"

const UNSCHEDULED = "unscheduled"

interface WeekPlannerProps {
  todos: Todo[]
  companions: Character[]
  onMoveTask: (taskId: number, dayIso: string | null, toIndex: number) => void
  onToggle: (id: number, el: HTMLElement | null) => void
  onEdit: (todo: Todo) => void
  onAdd: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function WeekPlanner({
  todos, companions, onMoveTask, onToggle, onEdit, onAdd, sidebarOpen, setSidebarOpen,
}: WeekPlannerProps) {
  const today = todayIso()
  const [weekStart, setWeekStart] = useState(() => weekStartIso(today))
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const grouped = useMemo(() => groupTodosForWeek(todos, weekStart), [todos, weekStart])
  const { unscheduled, overdue } = useMemo(() => partitionUnscheduledOverdue(todos, today), [todos, today])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const companionName = (id?: number) => companions.find((c) => c.id === id)?.name

  // Build a lookup from any sortable/container id to its container id (a day iso or UNSCHEDULED).
  const containerOf = (id: string | number): string | null => {
    const sid = String(id)
    if (sid === UNSCHEDULED || days.includes(sid)) return sid
    const t = todos.find((x) => x.id === Number(sid))
    if (!t) return null
    if (!t.scheduledDate) return UNSCHEDULED
    return days.includes(t.scheduledDate) ? t.scheduledDate : null
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const dest = containerOf(over.id)
    if (!dest) return // dropped somewhere not droppable (e.g. overdue) — ignore
    const destItems = dest === UNSCHEDULED ? unscheduled : grouped[dest] || []
    // index = position of the card we dropped onto, else append to end
    const overId = Number(over.id)
    const idx = destItems.findIndex((t) => t.id === overId)
    const toIndex = idx >= 0 ? idx : destItems.length
    onMoveTask(Number(active.id), dest === UNSCHEDULED ? null : dest, toIndex)
  }

  const rangeLabel = `${weekStart} → ${addDaysIso(weekStart, 6)}`

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pt-14 lg:pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden bg-gray-900 border border-gray-800">
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Planner</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDaysIso(w, -7))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStartIso(today))} className="text-xs">This week</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart((w) => addDaysIso(w, 7))}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" onClick={onAdd} className="bg-purple-600 hover:bg-purple-700 ml-1"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">{rangeLabel}</p>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-4">
          {days.map((d, i) => (
            <PlannerDay
              key={d}
              containerId={d}
              title={WEEKDAY_LABELS[i]}
              subtitle={d.slice(5)}
              highlight={d === today}
              todos={grouped[d]}
              companionName={companionName}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PlannerDay
            containerId={UNSCHEDULED}
            title="📥 Unscheduled"
            todos={unscheduled}
            companionName={companionName}
            onToggle={onToggle}
            onEdit={onEdit}
          />
          <PlannerDay
            containerId="overdue"
            title="⚠ Overdue"
            todos={overdue}
            overdue
            droppable={false}
            companionName={companionName}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        </div>
      </DndContext>
    </div>
  )
}
