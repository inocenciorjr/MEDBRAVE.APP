import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { 
  Target, 
  Plus, 
  Check, 
  X, 
  Edit3,
  Trash2,
  Calendar
} from 'lucide-react';

export default function WeeklyGoalsCard({ 
  goals = [], 
  onAddGoal, 
  onUpdateGoal, 
  onDeleteGoal,
  weekProgress = 0 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAddGoal = () => {
    if (newGoalText.trim()) {
      onAddGoal?.(newGoalText.trim());
      setNewGoalText('');
      setIsAdding(false);
    }
  };

  const handleEditGoal = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdateGoal?.(editingId, { text: editText.trim() });
      setEditingId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const completedGoals = goals.filter(goal => goal.completed).length;
  const totalGoals = goals.length;
  const progressPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="relative h-full">
      <Card className="border-0 shadow-md bg-card backdrop-blur-sm overflow-hidden h-full flex flex-col">
        {/* Header */}
        <CardHeader className="p-6 bg-primary/10">
          <div className="p-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground font-bold text-lg">
                    TO DO
                  </CardTitle>
                  <p className="text-muted-foreground text-sm font-medium">
                    Metas da semana
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-foreground font-bold text-lg">
                  {completedGoals}/{totalGoals}
                </div>
                <div className="text-muted-foreground text-xs">
                  {progressPercentage}%
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold text-primary">{progressPercentage}%</span>
            </div>
            <div className="relative">
              <Progress value={progressPercentage} className="h-2 bg-muted" />
              <div 
                className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Goals list */}
          <div className="space-y-3 flex-1 overflow-y-auto">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`
                  group flex items-center space-x-3 p-3 rounded-xl border transition-all duration-200
                  ${goal.completed 
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' 
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                  }
                `}
              >
                <button
                  onClick={() => onUpdateGoal?.(goal.id, { completed: !goal.completed })}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                    ${goal.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-muted-foreground/30 hover:border-primary'
                    }
                  `}
                >
                  {goal.completed && <Check className="h-3 w-3" />}
                </button>

                {editingId === goal.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={`
                      flex-1 text-sm transition-all duration-200
                      ${goal.completed 
                        ? 'line-through text-muted-foreground' 
                        : 'text-foreground'
                      }
                    `}>
                      {goal.text}
                    </span>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditGoal(goal.id, goal.text)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                      >
                        <Edit3 className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteGoal?.(goal.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add new goal */}
            {isAdding ? (
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex-shrink-0" />
                <Input
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="Digite sua meta..."
                  className="flex-1 h-8 text-sm border-0 bg-transparent focus:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddGoal();
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleAddGoal} className="h-8 w-8 p-0">
                  <Check className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsAdding(true)}
                className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-muted-foreground/30 hover:border-primary/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                + Item
              </Button>
            )}
          </div>

          {/* Empty state */}
          {goals.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-2">Sem tarefas planejadas!</p>
              <p className="text-xs">
                Clique nos dias ao lado e crie as tarefas dessa semana.
              </p>
            </div>
          )}

          {/* Weekly insight */}
          <div className="pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Hora definir as metas dessa semana?
              </p>
              <Button
                size="sm"
                onClick={() => setIsAdding(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Definir Meta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

