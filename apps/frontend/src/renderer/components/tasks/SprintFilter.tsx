/**
 * SprintFilter Component (Story 6.3)
 * Dropdown filter for filtering Kanban tasks by sprint
 */
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { useSprintStore } from '../../stores/sprint-store';

interface SprintFilterProps {
  value: string | null;
  onChange: (sprintId: string | null) => void;
  className?: string;
}

export function SprintFilter({ value, onChange, className }: SprintFilterProps) {
  const { t } = useTranslation(['tasks', 'planning']);
  const { sprints } = useSprintStore();

  const handleChange = (newValue: string) => {
    onChange(newValue === 'all' ? null : newValue);
  };

  return (
    <Select value={value ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('tasks:filter.selectSprint')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          {t('tasks:filter.allSprints')}
        </SelectItem>
        {sprints.map((sprint) => (
          <SelectItem key={sprint.id} value={sprint.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: sprint.color }}
              />
              <span className="truncate">{sprint.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
