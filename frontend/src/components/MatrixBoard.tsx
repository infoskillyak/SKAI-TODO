import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical, Clock, Zap } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';

type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Task {
  id: string;
  content: string;
  quadrant: QuadrantType;
  duration?: number;
  energyLevel?: number;
}

interface MatrixBoardProps {
  tasks: Record<QuadrantType, Task[]>;
  setTasks: React.Dispatch<React.SetStateAction<Record<QuadrantType, Task[]>>>;
  onTaskMove?: (taskId: string, newQuadrant: QuadrantType) => Promise<void>;
}

const quadrantMeta: Record<QuadrantType, { title: string; subtitle: string; borderColor: string; textColor: string; bgGlow: string }> = {
  Q1: { title: 'Do First', subtitle: 'Urgent & Important', borderColor: 'border-t-[var(--color-skai-q1)]', textColor: 'text-[var(--color-skai-q1)]', bgGlow: 'rgba(239,68,68,0.05)' },
  Q2: { title: 'Schedule', subtitle: 'Not Urgent & Important', borderColor: 'border-t-[var(--color-skai-q2)]', textColor: 'text-[var(--color-skai-q2)]', bgGlow: 'rgba(59,130,246,0.05)' },
  Q3: { title: 'Delegate', subtitle: 'Urgent & Not Important', borderColor: 'border-t-[var(--color-skai-q3)]', textColor: 'text-[var(--color-skai-q3)]', bgGlow: 'rgba(245,158,11,0.05)' },
  Q4: { title: 'Eliminate', subtitle: 'Not Urgent & Not Important', borderColor: 'border-t-[var(--color-skai-q4)]', textColor: 'text-[var(--color-skai-q4)]', bgGlow: 'rgba(107,114,128,0.05)' },
};

export function MatrixBoard({ tasks, setTasks, onTaskMove }: MatrixBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceQuad = source.droppableId as QuadrantType;
    const destQuad = destination.droppableId as QuadrantType;

    const sourceTasks = Array.from(tasks[sourceQuad]);
    const destTasks = sourceQuad === destQuad ? sourceTasks : Array.from(tasks[destQuad]);

    const [removed] = sourceTasks.splice(source.index, 1);
    removed.quadrant = destQuad;
    destTasks.splice(destination.index, 0, removed);

    setTasks({
      ...tasks,
      [sourceQuad]: sourceTasks,
      [destQuad]: destTasks,
    });

    if (onTaskMove && removed.id) {
      try {
        await onTaskMove(removed.id, destQuad);
      } catch (error) {
        console.error('Failed to update task quadrant:', error);
      }
    }
  };

  return (
    <div className="flex-1 p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-skai-accent)] to-blue-400 bg-clip-text text-transparent">
          Eisenhower Matrix
        </h1>
        <span className="text-xs text-slate-500">Drag tasks between quadrants</span>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 min-h-0">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as QuadrantType[]).map((quadId) => {
            const meta = quadrantMeta[quadId];
            return (
              <div
                key={quadId}
                className={`quadrant-container border-t-4 ${meta.borderColor}`}
                style={{ background: `linear-gradient(135deg, var(--color-skai-card), ${meta.bgGlow})` }}
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-base font-semibold ${meta.textColor}`}>{meta.title}</h2>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      {tasks[quadId].length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{meta.subtitle}</p>
                </div>

                <Droppable droppableId={quadId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                    >
                      {tasks[quadId].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`task-card flex items-start gap-3 cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-[var(--color-skai-accent)]/50 brightness-110' : ''}`}
                              onClick={() => !snapshot.isDragging && setSelectedTask(task)}
                            >
                              <div {...provided.dragHandleProps} className="text-slate-600 hover:text-white mt-0.5 transition-colors">
                                <GripVertical size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{task.content}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                                  {task.duration && (
                                    <span className="flex items-center gap-1"><Clock size={11} /> {task.duration}m</span>
                                  )}
                                  {task.energyLevel && (
                                    <span className="flex items-center gap-1"><Zap size={11} className="text-yellow-500" /> Lvl {task.energyLevel}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDetailModal
          task={{
            id: selectedTask.id,
            title: selectedTask.content,
            description: undefined,
            quadrant: selectedTask.quadrant,
            status: 'TODO',
            duration: selectedTask.duration,
            energyLevel: selectedTask.energyLevel,
          }}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
