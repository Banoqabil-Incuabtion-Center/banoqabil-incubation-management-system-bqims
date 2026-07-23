import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { TaskCard } from "./TaskCard"
import type { Task, TaskStatus } from "@/repositories/taskRepo"

interface BoardColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAdd: (status: TaskStatus) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export function BoardColumn({ status, tasks, onAdd, onEdit, onDelete }: BoardColumnProps) {
  // Column ids are the status strings themselves; they can never collide with
  // the 24-hex task ids also registered with the DndContext.
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-xl bg-muted/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{status}</h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 cursor-pointer"
          onClick={() => onAdd(status)}
          aria-label={`Add task to ${status}`}
        >
          <IconPlus className="size-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-col gap-2 rounded-lg transition-colors ${
          isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""
        }`}
      >
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center py-6 text-xs text-muted-foreground">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  )
}
