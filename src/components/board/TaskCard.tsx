import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { MdDeleteSweep, MdEditSquare } from "react-icons/md"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Task, TaskPriority } from "@/repositories/taskRepo"

const PRIORITY_VARIANT: Record<TaskPriority, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

const isOverdue = (dueDate: string | null, status: Task["status"]) =>
  !!dueDate && status !== "Done" && new Date(dueDate) < new Date(new Date().toDateString())

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab touch-none rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>

        {/* Stop pointer events reaching the drag listeners, or the buttons never fire */}
        <div
          className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
          >
            <MdEditSquare className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer text-red-600 hover:text-red-700"
            onClick={() => onDelete(task._id)}
            aria-label={`Delete ${task.title}`}
          >
            <MdDeleteSweep className="size-4" />
          </Button>
        </div>
      </div>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={`border-0 text-[11px] font-medium ${PRIORITY_VARIANT[task.priority]}`}>
          {task.priority}
        </Badge>

        {task.dueDate && (
          <span
            className={`text-[11px] ${overdue ? "font-medium text-red-600" : "text-muted-foreground"}`}
          >
            {new Date(task.dueDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}

        {task.assignees?.length > 0 && (
          <div className="ml-auto flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee._id} className="size-6 border-2 border-background">
                {assignee.avatar && <AvatarImage src={assignee.avatar} alt={assignee.name} />}
                <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 3 && (
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
