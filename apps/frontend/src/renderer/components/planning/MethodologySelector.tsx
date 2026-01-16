import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import type { Methodology } from '../../stores/planning/sessionStore';

interface MethodologySelectorProps {
  onSelect: (methodology: Methodology) => void;
  isLoading?: boolean;
}

interface MethodologyOption {
  id: Methodology;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
}

const METHODOLOGY_OPTIONS: MethodologyOption[] = [
  {
    id: 'bmad',
    nameKey: 'planning:methodology.bmad.name',
    descriptionKey: 'planning:methodology.bmad.description',
    icon: ClipboardList
  }
];

export function MethodologySelector({ onSelect, isLoading = false }: MethodologySelectorProps) {
  const { t } = useTranslation(['planning']);
  const [selectedMethodology, setSelectedMethodology] = useState<Methodology | null>(null);

  const handleSelect = (methodology: Methodology) => {
    setSelectedMethodology(methodology);
  };

  const handleStart = () => {
    if (selectedMethodology) {
      onSelect(selectedMethodology);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('planning:selectMethodology')}
        </h3>
      </div>

      <div className="grid gap-4">
        {METHODOLOGY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMethodology === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all',
                isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'hover:border-primary/50'
              )}
              onClick={() => handleSelect(option.id)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{t(option.nameKey)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {t(option.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleStart}
          disabled={!selectedMethodology || isLoading}
          className="gap-2"
        >
          {t('planning:startPlanning')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
