import type React from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function Stat({
  icon, label, value, hint, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  accent: "purple" | "orange" | "green" | "blue"
}) {
  const accentText = {
    purple: "text-purple-400",
    orange: "text-orange-400",
    green: "text-green-400",
    blue: "text-blue-400",
  }[accent]
  return (
    <Card className="bg-gray-900 border-gray-800 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-gray-500">{label}</p>
          {icon}
        </div>
        <p className={`text-xl sm:text-2xl font-bold ${accentText}`}>{value}</p>
        {hint && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{hint}</p>}
      </CardContent>
    </Card>
  )
}
