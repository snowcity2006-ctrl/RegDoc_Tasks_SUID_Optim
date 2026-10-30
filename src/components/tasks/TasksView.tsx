import React, { useState, useMemo, useEffect } from 'react';
import { TaskRecord, TaskFilterState, Employee } from '../../types';
import { TaskFilters } from './TaskFilters';
import { TaskTable } from './TaskTable';
import { TaskFormModal } from './TaskFormModal';
import { TaskExportModal } from './TaskExportModal';
import { calculateDaysRemaining } from '../../utils/taskUtils';

interface TasksViewProps {
  tasks: TaskRecord[];
  employees: Employee[];
  onSaveTask: (task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  onSaveTasks?: (taskList: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onToggleTaskCheck: (id: number, field: 'isCompleted' | 'isAccepted', value: boolean) => Promise<void>;
  onOpenNewEmployeeModal?: () => void;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
  createTaskTrigger?: number;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  employees,
  onSaveTask,
  onSaveTasks,
  onDeleteTask,
  onToggleTaskCheck,
  onOpenNewEmployeeModal,
  showNotification,
  createTaskTrigger,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [filters, setFilters] = useState<TaskFilterState>({
    searchQuery: '',
    status: 'all',
    assigneeId: null,
    assigneeIds: [],
    plannedFrom: '',
    plannedTo: '',
  });

  // Фильтрация списка задач
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Поиск по тексту задачи и результату
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchTask = t.task.toLowerCase().includes(query);
        const matchResult = (t.result || '').toLowerCase().includes(query);
        const matchAssignee = (t.assigneeName || '').toLowerCase().includes(query);
        if (!matchTask && !matchResult && !matchAssignee) {
          return false;
        }
      }

      // Фильтр по ответственному (множественный выбор и ручной ввод)
      if (filters.assigneeIds && filters.assigneeIds.length > 0) {
        if (!t.assigneeId || !filters.assigneeIds.includes(t.assigneeId)) {
          return false;
        }
      } else if (filters.assigneeId !== null && filters.assigneeId !== undefined && t.assigneeId !== filters.assigneeId) {
        return false;
      }

      // Фильтр по диапазону плановых дат
      if (filters.plannedFrom && t.plannedEndDate < filters.plannedFrom) {
        return false;
      }
      if (filters.plannedTo && t.plannedEndDate > filters.plannedTo) {
        return false;
      }

      // Фильтр по статусу
      if (filters.status !== 'all') {
        const days = calculateDaysRemaining(
          t.plannedEndDate,
          t.isAccepted,
          t.frozenDaysRemaining,
          t.actualEndDate
        );

        if (filters.status === 'accepted') {
          return t.isAccepted;
        }
        if (filters.status === 'completed') {
          return t.isCompleted && !t.isAccepted;
        }
        if (filters.status === 'due_today') {
          return !t.isAccepted && days === 0;
        }
        if (filters.status === 'overdue') {
          return !t.isAccepted && days !== null && days < 0;
        }
        if (filters.status === 'in_progress') {
          return !t.isAccepted;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  useEffect(() => {
    if (createTaskTrigger && createTaskTrigger > 0) {
      handleOpenCreate();
    }
  }, [createTaskTrigger]);

  const handleEdit = (task: TaskRecord) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await onDeleteTask(id);
      showNotification?.('Задача успешно удалена', 'success');
    } catch (err: any) {
      showNotification?.(err.message || 'Ошибка при удалении задачи', 'error');
    }
  };

  const handleToggleCheck = async (id: number, field: 'isCompleted' | 'isAccepted', value: boolean) => {
    try {
      await onToggleTaskCheck(id, field, value);
      showNotification?.(
        field === 'isAccepted'
          ? value
            ? 'Задача принята, счетчик дней зафиксирован'
            : 'Отметка принятия снята'
          : value
          ? 'Задача отмечена как выполненная'
          : 'Отметка выполнения снята',
        'info'
      );
    } catch (err: any) {
      showNotification?.(err.message || 'Ошибка обновления статуса задачи', 'error');
    }
  };

  const handleSave = async (taskData: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => {
    await onSaveTask(taskData);
    showNotification?.(
      taskData.id ? 'Задача успешно обновлена' : 'Новая задача успешно создана',
      'success'
    );
  };

  const handleSaveMultiple = async (taskList: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (onSaveTasks) {
      await onSaveTasks(taskList);
    } else {
      for (const t of taskList) {
        await onSaveTask(t);
      }
      showNotification?.(`Успешно создано задач: ${taskList.length} (для каждого выбранного исполнителя)`, 'success');
    }
  };

  const handleChangeActualDate = async (id: number, actualEndDate: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      let frozenDays: number | null = task.frozenDaysRemaining;
      if (task.isAccepted) {
        frozenDays = actualEndDate
          ? calculateDaysRemaining(task.plannedEndDate, true, null, actualEndDate)
          : null;
      }
      await onSaveTask({
        ...task,
        actualEndDate,
        frozenDaysRemaining: frozenDays,
      });
      showNotification?.(
        actualEndDate
          ? `Фактическая дата для задачи №${id} установлена: ${actualEndDate.split('-').reverse().join('.')}`
          : `Фактическая дата для задачи №${id} очищена`,
        'info'
      );
    } catch (err: any) {
      showNotification?.(err.message || 'Ошибка обновления фактической даты', 'error');
    }
  };

  return (
    <div className="space-y-4">

      {/* Панель фильтрации и статистики */}
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        employees={employees}
        tasks={tasks}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* Таблица задач */}
      <TaskTable
        tasks={filteredTasks}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
        searchQuery={filters.searchQuery}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleCheck={handleToggleCheck}
        onChangeActualDate={handleChangeActualDate}
        onOpenExport={() => setExportModalOpen(true)}
      />

      {/* Модальное окно выгрузки задач в Excel */}
      <TaskExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filteredTasks={filteredTasks}
        showNotification={showNotification}
      />

      {/* Модальное окно создания/редактирования задачи */}
      {formOpen && (
        <TaskFormModal
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
          onSaveMultiple={handleSaveMultiple}
          employees={employees}
          tasks={tasks}
          initialData={editingTask}
          onOpenNewEmployeeModal={onOpenNewEmployeeModal}
        />
      )}
    </div>
  );
};
