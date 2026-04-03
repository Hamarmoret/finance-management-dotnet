import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Target,
  TrendingUp,
  Calendar,
  Plus,
  ChevronDown,
  AlertCircle,
  Check,
  Clock,
  XCircle,
  Settings,
  DollarSign,
  Users,
  BarChart3,
} from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import type {
  BusinessPlan as BusinessPlanType,
  BusinessPlanWithDetails,
  BusinessPlanWithEngine,
  PlanActualsComparison,
  PlanRevenueModel,
} from '@finance/shared';

// Components
import { CreatePlanModal } from './components/CreatePlanModal';
import { ProjectionsTable } from './components/ProjectionsTable';
import { GoalsList } from './components/GoalsList';
import { GoalModal } from './components/GoalModal';
import { ScenarioToggle } from './components/ScenarioToggle';
import { DriversPanel } from './components/DriversPanel';
import { RevenueModelBuilder } from './components/RevenueModelBuilder';
import { CostPlanningView } from './components/CostPlanningView';
import { StaffingForecast } from './components/StaffingForecast';
import { DriverModal } from './components/DriverModal';
import { CostCategoryModal } from './components/CostCategoryModal';
import { StaffingRuleModal } from './components/StaffingRuleModal';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type TabType = 'overview' | 'drivers' | 'revenue' | 'costs' | 'staffing' | 'projections' | 'goals';

export default function BusinessPlan() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [plans, setPlans] = useState<BusinessPlanType[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlanWithDetails | null>(null);
  const [planWithEngine, setPlanWithEngine] = useState<BusinessPlanWithEngine | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [actualsComparison, setActualsComparison] = useState<PlanActualsComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [showCostCategoryModal, setShowCostCategoryModal] = useState(false);
  const [editingCostCategoryId, setEditingCostCategoryId] = useState<string | null>(null);
  const [showStaffingRuleModal, setShowStaffingRuleModal] = useState(false);
  const [editingStaffingRuleId, setEditingStaffingRuleId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Track abort controllers for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  // Fetch plans list on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  // Handle URL param for plan selection - runs once when plans are loaded
  useEffect(() => {
    if (plans.length === 0 || initializedRef.current) return;

    const planId = searchParams.get('plan');
    if (planId && plans.some((p) => p.id === planId)) {
      setSelectedPlanId(planId);
    } else {
      const activePlan = plans.find((p) => p.status === 'active') || plans[0];
      if (activePlan) {
        setSelectedPlanId(activePlan.id);
        setSearchParams({ plan: activePlan.id }, { replace: true });
      }
    }
    initializedRef.current = true;
  }, [plans]);

  // Fetch selected plan details when plan changes
  useEffect(() => {
    if (!selectedPlanId) return;

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset scenario when plan changes
    setActiveScenarioId(null);

    const fetchAllPlanData = async () => {
      setDetailsLoading(true);
      try {
        await Promise.all([
          fetchPlanDetails(selectedPlanId),
          fetchPlanWithEngine(selectedPlanId),
          fetchActualsComparison(selectedPlanId),
        ]);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchAllPlanData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedPlanId]);

  // Set default scenario when engine data loads
  useEffect(() => {
    if (planWithEngine?.scenarios?.length && !activeScenarioId) {
      const baseScenario = planWithEngine.scenarios.find((s) => s.name === 'base');
      setActiveScenarioId(baseScenario?.id || planWithEngine.scenarios[0]?.id || null);
    }
  }, [planWithEngine?.scenarios]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/business-plans');
      setPlans(response.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanDetails = async (planId: string) => {
    try {
      const response = await api.get(`/business-plans/${planId}`);
      setSelectedPlan(response.data.data ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const fetchPlanWithEngine = async (planId: string) => {
    try {
      const response = await api.get(`/business-plans/${planId}/engine`);
      setPlanWithEngine(response.data.data ?? null);
    } catch (err) {
      console.error('Failed to fetch plan engine data:', err);
    }
  };

  const fetchActualsComparison = async (planId: string) => {
    try {
      const response = await api.get(`/business-plans/${planId}/actuals`);
      setActualsComparison(response.data.data ?? []);
    } catch (err) {
      console.error('Failed to fetch actuals:', err);
    }
  };

  const handlePlanCreated = (plan: BusinessPlanType) => {
    setPlans((prev) => [plan, ...prev]);
    setSelectedPlanId(plan.id);
    setSearchParams({ plan: plan.id });
    setShowCreateModal(false);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setSearchParams({ plan: planId });
    setPlanSelectorOpen(false);
    setActiveScenarioId(null);
  };

  const handleProjectionsUpdated = async () => {
    if (selectedPlanId) {
      await fetchPlanDetails(selectedPlanId);
      await fetchActualsComparison(selectedPlanId);
    }
  };

  const handleGoalCreated = async () => {
    setShowGoalModal(false);
    setEditingGoalId(null);
    if (selectedPlanId) {
      await fetchPlanDetails(selectedPlanId);
    }
  };

  const handleEditGoal = (goalId: string) => {
    setEditingGoalId(goalId);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!selectedPlanId) return;
    try {
      await api.delete(`/business-plans/${selectedPlanId}/goals/${goalId}`);
      await fetchPlanDetails(selectedPlanId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Driver change handler with recalculation
  const handleDriverChange = useCallback(async (driverId: string, value: number) => {
    if (!selectedPlanId) return;
    try {
      await api.patch(`/business-plans/${selectedPlanId}/drivers/${driverId}`, { value });

      if (activeScenarioId) {
        await api.post(`/business-plans/${selectedPlanId}/calculate`, { scenarioId: activeScenarioId });
      }

      await fetchPlanWithEngine(selectedPlanId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [selectedPlanId, activeScenarioId]);

  // Revenue models update handler
  const handleRevenueModelsUpdate = useCallback(async (models: Partial<PlanRevenueModel>[]) => {
    if (!selectedPlanId) return;
    try {
      await api.put(`/business-plans/${selectedPlanId}/revenue-models`, { models });

      if (activeScenarioId) {
        await api.post(`/business-plans/${selectedPlanId}/calculate`, { scenarioId: activeScenarioId });
      }

      await fetchPlanWithEngine(selectedPlanId);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [selectedPlanId, activeScenarioId]);

  // Get scenario-specific data
  const scenarioDrivers = planWithEngine?.drivers?.filter(
    (d) => d.scenarioId === null || d.scenarioId === activeScenarioId
  ) ?? [];
  const scenarioRevenueModels = planWithEngine?.revenueModels?.filter(
    (m) => m.scenarioId === null || m.scenarioId === activeScenarioId
  ) ?? [];
  const scenarioStaffing = planWithEngine?.staffingPlan?.filter(
    (s) => s.scenarioId === null || s.scenarioId === activeScenarioId
  ) ?? [];
  const scenarioResults = planWithEngine?.calculatedResults?.filter(
    (r) => r.scenarioId === activeScenarioId
  ) ?? [];

  // Calculate totals from actuals comparison
  const totalProjectedRevenue = actualsComparison.reduce((sum, p) => sum + p.projected.revenue, 0);
  const totalActualRevenue = actualsComparison.reduce((sum, p) => sum + p.actual.revenue, 0);
  const totalProjectedExpenses = actualsComparison.reduce((sum, p) => sum + p.projected.expenses, 0);
  const totalActualExpenses = actualsComparison.reduce((sum, p) => sum + p.actual.expenses, 0);
  const totalProjectedProfit = totalProjectedRevenue - totalProjectedExpenses;
  const totalActualProfit = totalActualRevenue - totalActualExpenses;

  // Calculate totals from engine results
  const engineTotalRevenue = scenarioResults.reduce((sum, r) => sum + r.projectedRevenue, 0);
  const engineTotalCosts = scenarioResults.reduce((sum, r) => sum + r.totalCosts, 0);
  const engineTotalProfit = scenarioResults.reduce((sum, r) => sum + r.operatingProfit, 0);
  const engineTotalHeadcount = scenarioResults.length > 0 ? scenarioResults[scenarioResults.length - 1]?.totalHeadcount || 0 : 0;

  // Calculate goal completion
  const completedGoals = selectedPlan?.goals?.filter((g) => g.status === 'completed').length ?? 0;
  const totalGoals = selectedPlan?.goals?.length ?? 0;
  const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  // Log to prevent unused variable warnings (will be used in future UI)
  console.debug('Plan metrics:', { totalProjectedProfit, totalActualProfit, goalCompletionRate });

  if (loading && plans.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof TrendingUp }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'drivers', label: 'Drivers', icon: Settings },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'costs', label: 'Costs', icon: BarChart3 },
    { id: 'staffing', label: 'Staffing', icon: Users },
    { id: 'projections', label: 'Projections', icon: Calendar },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-600" />
            Business Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Set targets, track progress, and achieve your goals.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Plan Selector */}
          {plans.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setPlanSelectorOpen(!planSelectorOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {selectedPlan ? `${selectedPlan.name} (${selectedPlan.fiscalYear})` : 'Select Plan'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {planSelectorOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setPlanSelectorOpen(false)} />
                  <div className="dropdown-menu absolute right-0 mt-2 w-64 z-50 py-1">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between dark:text-gray-200 ${
                          plan.id === selectedPlanId ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium dark:text-white">{plan.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">FY {plan.fiscalYear}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            plan.status === 'active'
                              ? 'bg-success-100 text-success-700'
                              : plan.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-danger-500 hover:text-danger-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="card card-body text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No Business Plans Yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">
            Create your first business plan to set financial targets and track goals.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-md mx-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Business Plan
          </button>
        </div>
      ) : selectedPlan ? (
        <>
          {/* Scenario Toggle */}
          {planWithEngine?.scenarios && planWithEngine.scenarios.length > 0 && (
            <ScenarioToggle
              scenarios={planWithEngine.scenarios}
              activeScenarioId={activeScenarioId}
              onChange={setActiveScenarioId}
            />
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Projected Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(engineTotalRevenue || selectedPlan.targetRevenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-success-600" />
                    </div>
                  </div>
                  {totalActualRevenue > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Actual: </span>
                      <span className="font-medium dark:text-gray-200">{formatCurrency(totalActualRevenue)}</span>
                    </div>
                  )}
                </div>

                <div className="card card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Projected Costs</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(engineTotalCosts || selectedPlan.targetExpenses)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-danger-50 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-danger-600 rotate-180" />
                    </div>
                  </div>
                </div>

                <div className="card card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Projected Profit</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(engineTotalProfit || selectedPlan.targetProfit)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div className="card card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Headcount</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{engineTotalHeadcount}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {completedGoals}/{totalGoals} goals complete
                    </p>
                  </div>
                </div>
              </div>

              {/* Mission & Vision */}
              {(selectedPlan.mission || selectedPlan.vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPlan.mission && (
                    <div className="card card-body">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Mission</h3>
                      <p className="text-gray-900 dark:text-white">{selectedPlan.mission}</p>
                    </div>
                  )}
                  {selectedPlan.vision && (
                    <div className="card card-body">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Vision</h3>
                      <p className="text-gray-900 dark:text-white">{selectedPlan.vision}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Goals Summary */}
              {(selectedPlan.goals?.length ?? 0) > 0 && (
                <div className="card">
                  <div className="card-header flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Goals Overview</h2>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y">
                    {selectedPlan.goals?.slice(0, 5).map((goal) => (
                      <div key={goal.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              goal.status === 'completed'
                                ? 'bg-success-100 text-success-600'
                                : goal.status === 'in_progress'
                                ? 'bg-primary-100 text-primary-600'
                                : goal.status === 'at_risk'
                                ? 'bg-danger-100 text-danger-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {goal.status === 'completed' ? (
                              <Check className="w-4 h-4" />
                            ) : goal.status === 'at_risk' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : goal.status === 'cancelled' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{goal.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{goal.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-24">
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
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-right">{goal.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drivers' && (
            <DriversPanel
              drivers={scenarioDrivers}
              onDriverChange={handleDriverChange}
              onAddDriver={() => {
                setEditingDriverId(null);
                setShowDriverModal(true);
              }}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueModelBuilder
              models={scenarioRevenueModels}
              scenarioId={activeScenarioId}
              onModelsUpdate={handleRevenueModelsUpdate}
            />
          )}

          {activeTab === 'costs' && (
            <CostPlanningView
              categories={planWithEngine?.costCategories || []}
              onAddCategory={() => {
                setEditingCostCategoryId(null);
                setShowCostCategoryModal(true);
              }}
              onEditCategory={(category) => {
                setEditingCostCategoryId(category.id);
                setShowCostCategoryModal(true);
              }}
              onDeleteCategory={async (categoryId) => {
                if (!selectedPlanId) return;
                try {
                  await api.delete(`/business-plans/${selectedPlanId}/cost-categories/${categoryId}`);
                  await fetchPlanWithEngine(selectedPlanId);
                } catch (err) {
                  setError(getErrorMessage(err));
                }
              }}
            />
          )}

          {activeTab === 'staffing' && (
            <StaffingForecast
              staffingRules={scenarioStaffing}
              drivers={scenarioDrivers}
              onAddRule={() => {
                setEditingStaffingRuleId(null);
                setShowStaffingRuleModal(true);
              }}
              onEditRule={(rule) => {
                setEditingStaffingRuleId(rule.id);
                setShowStaffingRuleModal(true);
              }}
              onDeleteRule={async (ruleId) => {
                if (!selectedPlanId) return;
                try {
                  await api.delete(`/business-plans/${selectedPlanId}/staffing/${ruleId}`);
                  await fetchPlanWithEngine(selectedPlanId);
                } catch (err) {
                  setError(getErrorMessage(err));
                }
              }}
            />
          )}

          {activeTab === 'projections' && (
            <ProjectionsTable
              planId={selectedPlan.id}
              projections={selectedPlan.projections}
              actualsComparison={actualsComparison}
              onUpdate={handleProjectionsUpdated}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsList
              goals={selectedPlan.goals}
              onAddGoal={() => {
                setEditingGoalId(null);
                setShowGoalModal(true);
              }}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}
        </>
      ) : detailsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card card-body text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select a Plan</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose a business plan from the dropdown above or create a new one.
          </p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePlanCreated}
        />
      )}

      {showGoalModal && selectedPlan && (
        <GoalModal
          planId={selectedPlan.id}
          goalId={editingGoalId}
          existingGoal={
            editingGoalId
              ? selectedPlan.goals.find((g) => g.id === editingGoalId)
              : undefined
          }
          onClose={() => {
            setShowGoalModal(false);
            setEditingGoalId(null);
          }}
          onSaved={handleGoalCreated}
        />
      )}

      {showDriverModal && selectedPlanId && planWithEngine && (
        <DriverModal
          planId={selectedPlanId}
          driver={editingDriverId ? scenarioDrivers.find((d) => d.id === editingDriverId) : null}
          scenarios={planWithEngine.scenarios}
          onClose={() => {
            setShowDriverModal(false);
            setEditingDriverId(null);
          }}
          onSaved={async () => {
            setShowDriverModal(false);
            setEditingDriverId(null);
            if (selectedPlanId) {
              await fetchPlanWithEngine(selectedPlanId);
            }
          }}
        />
      )}

      {showCostCategoryModal && selectedPlanId && planWithEngine && (
        <CostCategoryModal
          planId={selectedPlanId}
          category={editingCostCategoryId
            ? planWithEngine.costCategories.find((c) => c.id === editingCostCategoryId)
            : null}
          drivers={scenarioDrivers}
          onClose={() => {
            setShowCostCategoryModal(false);
            setEditingCostCategoryId(null);
          }}
          onSaved={async () => {
            setShowCostCategoryModal(false);
            setEditingCostCategoryId(null);
            if (selectedPlanId) {
              await fetchPlanWithEngine(selectedPlanId);
            }
          }}
        />
      )}

      {showStaffingRuleModal && selectedPlanId && planWithEngine && (
        <StaffingRuleModal
          planId={selectedPlanId}
          rule={editingStaffingRuleId
            ? scenarioStaffing.find((s) => s.id === editingStaffingRuleId)
            : null}
          drivers={scenarioDrivers}
          scenarios={planWithEngine.scenarios}
          onClose={() => {
            setShowStaffingRuleModal(false);
            setEditingStaffingRuleId(null);
          }}
          onSaved={async () => {
            setShowStaffingRuleModal(false);
            setEditingStaffingRuleId(null);
            if (selectedPlanId) {
              await fetchPlanWithEngine(selectedPlanId);
            }
          }}
        />
      )}
    </div>
  );
}
