import {
  Target,
  Plus,
  MoreVertical,
  Check,
  Clock,
  AlertCircle,
  XCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { PlanGoal, GoalCategory, GoalStatus, GoalPriority } from '@finance/shared';
import { formatDate } from '../../../utils/formatters';

interface GoalsListProps {
  goals: PlanGoal[];
  onAddGoal: () => void;
  onEditGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

const categoryColors: Record<GoalCategory, string> = {
  revenue: 'bg-green-100 text-green-700',
  growth: 'bg-blue-100 text-blue-700',
  operations: 'bg-purple-100 text-purple-700',
  product: 'bg-orange-100 text-orange-700',
  team: 'bg-pink-100 text-pink-700',
  customer: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
};

const statusConfig: Record<GoalStatus, { icon: typeof Check; color: string; label: string }> = {
  not_started: { icon: Clock, color: 'text-gray-500', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-primary-600', label: 'In Progress' },
  at_risk: { icon: AlertCircle, color: 'text-danger-600', label: 'At Risk' },
  completed: { icon: Check, color: 'text-success-600', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

const priorityColors: Record<GoalPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
};

export function GoalsList({ goals, onAddGoal, onEditGoal, onDeleteGoal }: GoalsListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (goalId: string) => {
    onDeleteGoal(goalId);
    setDeleteConfirmId(null);
  };

  // Group goals by status
  const activeGoals = goals.filter(
    (g) => g.status === 'in_progress' || g.status === 'at_risk'
  );
  const pendingGoals = goals.filter((g) => g.status === 'not_started');
  const completedGoals = goals.filter(
    (g) => g.status === 'completed' || g.status === 'cancelled'
  );

  const renderGoalCard = (goal: PlanGoal) => {
    const StatusIcon = statusConfig[goal.status].icon;
    const isCompleted = goal.status === 'completed' || goal.status === 'cancelled';

    return (
      <div
        key={goal.id}
        className={`card card-body ${isCompleted ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                goal.status === 'completed'
                  ? 'bg-success-100'
                  : goal.status === 'at_risk'
                  ? 'bg-danger-100'
                  : goal.status === 'in_progress'
                  ? 'bg-primary-100'
                  : 'bg-gray-100'
              }`}
            >
              <StatusIcon className={`w-5 h-5 ${statusConfig[goal.status].color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`font-medium ${
                    isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}
                >
                  {goal.title}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[goal.category]}`}
                >
                  {goal.category}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[goal.priority]}`}
                >
                  {goal.priority}
                </span>
              </div>
              {goal.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{goal.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {goal.targetValue && (
                  <span>
                    Target: {goal.currentValue}/{goal.targetValue} {goal.unit}
                  </span>
                )}
                {goal.targetDate && <span>Due: {formatDate(goal.targetDate)}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="w-32 hidden sm:block">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    goal.status === 'completed'
                      ? 'bg-success-500'
                      : goal.status === 'at_risk'
                      ? 'bg-danger-500'
                      : 'bg-primary-500'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === goal.id ? null : goal.id)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {openMenuId === goal.id && (
                <>
                  <div className="fixed inset-0" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border z-50 py-1">
                    <button
                      onClick={() => {
                        onEditGoal(goal.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId(goal.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Progress */}
        <div className="mt-3 sm:hidden">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                goal.status === 'completed'
                  ? 'bg-success-500'
                  : goal.status === 'at_risk'
                  ? 'bg-danger-500'
                  : 'bg-primary-500'
              }`}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Delete Confirmation */}
        {deleteConfirmId === goal.id && (
          <div className="mt-4 p-4 bg-danger-50 rounded-lg">
            <p className="text-sm text-danger-700 mb-3">
              Are you sure you want to delete this goal?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(goal.id)}
                className="btn btn-danger btn-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          Goals & Objectives
        </h2>
        <button
          onClick={onAddGoal}
          className="btn btn-primary btn-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card card-body text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Goals Yet</h3>
          <p className="text-gray-600 mt-2 mb-4">
            Create goals to track your progress toward strategic objectives.
          </p>
          <button onClick={onAddGoal} className="btn btn-primary btn-md mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Active ({activeGoals.length})
              </h3>
              <div className="space-y-3">{activeGoals.map(renderGoalCard)}</div>
            </div>
          )}

          {/* Pending Goals */}
          {pendingGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Not Started ({pendingGoals.length})
              </h3>
              <div className="space-y-3">{pendingGoals.map(renderGoalCard)}</div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Completed ({completedGoals.length})
              </h3>
              <div className="space-y-3">{completedGoals.map(renderGoalCard)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
