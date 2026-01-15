# Frontend Component Patterns

This document details the UI component system in Auto Claude, covering organization, Radix UI integration, Tailwind CSS styling conventions, and interactive patterns like drag-and-drop.

**Target Audience:** Frontend developers implementing or extending UI components.

**What You'll Learn:**
- Component organization and structure patterns
- How to use and extend Radix UI primitives
- Tailwind CSS styling conventions and utilities
- Creating variants with class-variance-authority
- Implementing drag-and-drop with @dnd-kit
- Accessibility best practices

---

## 🗂️ Component Organization

### Directory Structure

Auto Claude uses a **two-tier component organization**:

```
auto-claude-ui/src/renderer/components/
├── ui/                          # Shared UI primitives (Radix UI + Tailwind)
│   ├── button.tsx              # Button with variants
│   ├── card.tsx                # Card with compound components
│   ├── dialog.tsx              # Modal dialogs
│   ├── input.tsx               # Text inputs
│   ├── select.tsx              # Dropdown selects
│   ├── switch.tsx              # Toggle switches
│   ├── tabs.tsx                # Tab navigation
│   ├── tooltip.tsx             # Hover tooltips
│   └── index.ts                # Barrel export
│
├── settings/                    # Feature-specific components
│   ├── ThemeSelector.tsx
│   ├── ProjectSelector.tsx
│   └── sections/
│       └── SectionRouter.tsx
│
├── terminal/
│   ├── TerminalGrid.tsx
│   └── Terminal.tsx
│
├── KanbanBoard.tsx             # Top-level feature components
├── SortableTaskCard.tsx        # Reusable feature-specific components
└── TaskCard.tsx
```

**Organization Principles:**

1. **UI Primitives** (`ui/`) - Generic, reusable components based on Radix UI
   - No business logic
   - Highly configurable via props
   - Consistent styling conventions
   - Exported via barrel file (`ui/index.ts`)

2. **Feature Components** - Domain-specific components
   - Compose UI primitives
   - Contain business logic
   - Connect to stores and APIs
   - Organized by feature area

---

## 🧩 Radix UI Integration

### What is Radix UI?

Radix UI provides **unstyled, accessible components** that handle complex interactions:
- Focus management
- Keyboard navigation
- ARIA attributes
- Screen reader support
- Portal-based rendering (modals, tooltips)

**Why Radix UI?**
- ✅ Accessibility built-in
- ✅ Headless (bring your own styles)
- ✅ Composable primitives
- ✅ Production-ready interactions

### Core Radix UI Pattern

All Radix UI components follow this pattern:

```typescript
// 1. Import Radix primitive
import * as DialogPrimitive from '@radix-ui/react-dialog';

// 2. Re-export root component as-is
const Dialog = DialogPrimitive.Root;

// 3. Wrap styled components with forwardRef
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      'fixed left-[50%] top-[50%] z-50 w-full max-w-lg',
      'translate-x-[-50%] translate-y-[-50%]',
      'bg-card border border-border rounded-2xl p-6',
      className
    )}
    {...props}
  >
    {children}
  </DialogPrimitive.Content>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// 4. Export all components
export { Dialog, DialogContent, DialogTrigger, DialogClose };
```

### Example: Dialog Component

**File:** `auto-claude-ui/src/renderer/components/ui/dialog.tsx`

```typescript
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Root component - no styling needed
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// Overlay with backdrop blur
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Content with animations
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-lg max-h-[90vh]',
        'translate-x-[-50%] translate-y-[-50%]',
        'bg-card border border-border rounded-2xl p-6 shadow-xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'duration-200 overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-lg p-1',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-accent transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export { Dialog, DialogContent, DialogTrigger, DialogClose };
```

**Usage:**

```typescript
import { Dialog, DialogContent, DialogTrigger } from './components/ui/dialog';

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger>Open Dialog</DialogTrigger>
      <DialogContent>
        <h2>Dialog Title</h2>
        <p>Dialog content goes here</p>
      </DialogContent>
    </Dialog>
  );
}
```

### Example: Button Component with Variants

**File:** `auto-claude-ui/src/renderer/components/ui/button.tsx`

```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Define variants using class-variance-authority
const buttonVariants = cva(
  // Base styles (always applied)
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
        outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-[var(--success)] text-[var(--success-foreground)] hover:bg-[var(--success)]/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm rounded-lg',
        sm: 'h-8 px-3 text-xs rounded-md',
        lg: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;  // Render as child element (polymorphic)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Usage:**

```typescript
import { Button } from './components/ui/button';

function MyComponent() {
  return (
    <>
      {/* Default button */}
      <Button onClick={() => console.log('clicked')}>
        Click Me
      </Button>

      {/* Variant styles */}
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Settings</Button>

      {/* Size variants */}
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Icon /></Button>

      {/* Polymorphic - render as Link */}
      <Button asChild>
        <a href="/home">Go Home</a>
      </Button>
    </>
  );
}
```

### Compound Components Pattern

Components like Card use **compound components** for flexible composition:

**File:** `auto-claude-ui/src/renderer/components/ui/card.tsx`

```typescript
import * as React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground transition-all duration-200',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

**Usage:**

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';

function TaskCard({ task }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
        <CardDescription>{task.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Task details...</p>
      </CardContent>
      <CardFooter>
        <Button>View Task</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 🎨 Tailwind CSS Styling Conventions

### Design Tokens (CSS Variables)

Auto Claude uses **CSS variables** for theming:

```css
/* Global theme variables */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

**Usage in Tailwind:**

```typescript
// Use semantic color names
<div className="bg-background text-foreground border-border">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### The cn() Utility

**File:** `auto-claude-ui/src/renderer/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * - clsx: Conditionally join class names
 * - twMerge: Intelligently merge Tailwind classes (later classes override)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Why cn()?**

1. **Conditional Classes:**
```typescript
<div className={cn(
  'base-class',
  isActive && 'active-class',
  isPending && 'pending-class',
  error ? 'error-class' : 'success-class'
)} />
```

2. **Merge Conflicts:**
```typescript
// Without twMerge - both padding classes applied (incorrect)
<div className={`p-4 ${customPadding}`} /> // "p-4 p-6" (broken)

// With cn() - later padding wins (correct)
<div className={cn('p-4', customPadding)} /> // "p-6" (works!)
```

3. **Override Default Styles:**
```typescript
function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 bg-primary',  // Default styles
        className                  // User overrides
      )}
      {...props}
    />
  );
}

// User can override padding
<Button className="px-6 py-3" /> // Uses px-6 py-3, not px-4 py-2
```

### Styling Patterns

#### 1. Layout Classes

```typescript
// Flexbox patterns
<div className="flex items-center justify-between gap-4">
  <span>Left</span>
  <span>Right</span>
</div>

// Grid patterns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Spacing
<div className="space-y-4">  {/* Vertical gap between children */}
  <p>Item 1</p>
  <p>Item 2</p>
</div>
```

#### 2. Interactive States

```typescript
// Hover effects
<button className="hover:bg-accent hover:text-accent-foreground transition-colors">
  Hover Me
</button>

// Focus states (accessibility)
<input className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />

// Active states
<button className="active:scale-[0.98] transition-transform">
  Click Me
</button>

// Disabled states
<button className="disabled:pointer-events-none disabled:opacity-50" disabled>
  Disabled
</button>
```

#### 3. Responsive Design

```typescript
// Mobile-first approach
<div className={cn(
  'text-sm',       // Base (mobile)
  'sm:text-base',  // Small screens (640px+)
  'lg:text-lg',    // Large screens (1024px+)
  'p-4',
  'sm:p-6',
  'lg:p-8'
)}>
  Responsive text
</div>
```

#### 4. Animations

```typescript
// Radix UI data-state animations
<div className={cn(
  'transition-all duration-200',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
)} />

// Custom transitions
<div className="transition-all duration-200 hover:scale-105 hover:shadow-lg" />
```

---

## 🎭 Class Variance Authority (CVA)

### What is CVA?

**class-variance-authority** creates **type-safe variant APIs** for components.

**Benefits:**
- ✅ Type-safe variants
- ✅ Automatic TypeScript inference
- ✅ Compound variants (combine multiple variants)
- ✅ Default variants

### Basic Example

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base classes (always applied)
  'inline-flex items-center justify-center font-medium transition-colors',
  {
    variants: {
      // Variant dimensions
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// TypeScript type for props
type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  // Additional props
}

function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Advanced: Compound Variants

Compound variants apply styles when **multiple variants match**:

```typescript
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
        lg: 'text-base px-3 py-1',
      },
    },
    compoundVariants: [
      // Apply special styles when variant=destructive AND size=lg
      {
        variant: 'destructive',
        size: 'lg',
        className: 'font-bold tracking-wide',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);
```

---

## 🖱️ Drag-and-Drop with @dnd-kit

### Why @dnd-kit?

**@dnd-kit** is a modern drag-and-drop library with:
- ✅ Accessibility (keyboard support)
- ✅ Touch support
- ✅ Customizable animations
- ✅ Collision detection algorithms
- ✅ TypeScript support

### Core Concepts

1. **DndContext** - Wraps draggable area
2. **Draggable** - Items that can be dragged
3. **Droppable** - Areas items can be dropped
4. **Sensors** - Input methods (mouse, touch, keyboard)
5. **Collision Detection** - Algorithm to detect drop targets

### Example: Sortable Task Cards

**File:** `auto-claude-ui/src/renderer/components/SortableTaskCard.tsx`

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import { cn } from '../lib/utils';
import type { Task } from '../../shared/types';

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
}

export function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,      // ARIA attributes
    listeners,       // Event handlers
    setNodeRef,      // Ref for DOM node
    transform,       // Transform state
    transition,      // CSS transition
    isDragging,      // Dragging state
    isOver           // Drop target state
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none transition-all duration-200',
        isDragging && 'dragging-placeholder opacity-40 scale-[0.98]',
        isOver && !isDragging && 'ring-2 ring-primary/30 ring-offset-2 rounded-xl'
      )}
      {...attributes}  // Spread ARIA attributes
      {...listeners}   // Spread event handlers
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}
```

### Example: Kanban Board with Drag-and-Drop

**File:** `auto-claude-ui/src/renderer/components/KanbanBoard.tsx`

```typescript
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors (input methods)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8  // Require 8px movement to start drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    // Handle drop logic
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === active.id);

    if (task && task.status !== newStatus) {
      updateTaskStatus(task.id, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {TASK_STATUS_COLUMNS.map(status => (
          <DroppableColumn
            key={status}
            status={status}
            tasks={tasks.filter(t => t.status === status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      {/* Visual feedback during drag */}
      <DragOverlay>
        {activeTask ? (
          <div className="drag-overlay-card opacity-80">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ status, tasks, onTaskClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 flex-col rounded-xl border border-border bg-secondary/30',
        isOver && 'drop-zone-highlight ring-2 ring-primary'
      )}
    >
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">{TASK_STATUS_LABELS[status]}</h2>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </div>

      <div className="flex-1 p-3">
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
```

### Drag-and-Drop Best Practices

1. **Activation Constraints** - Prevent accidental drags
```typescript
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8  // Require 8px movement
  }
})
```

2. **Visual Feedback** - Show drag state clearly
```typescript
className={cn(
  'transition-all',
  isDragging && 'opacity-40 scale-[0.98]',
  isOver && 'ring-2 ring-primary'
)}
```

3. **Keyboard Support** - Enable sortableKeyboardCoordinates
```typescript
useSensor(KeyboardSensor, {
  coordinateGetter: sortableKeyboardCoordinates
})
```

4. **Touch Support** - PointerSensor handles touch automatically
```typescript
<div className="touch-none" {...listeners}>  {/* Prevent scroll conflicts */}
  <TaskCard />
</div>
```

---

## ♿ Accessibility Best Practices

### 1. Semantic HTML

```typescript
// ❌ Bad - divs everywhere
<div onClick={handleClick}>Click me</div>

// ✅ Good - semantic button
<button onClick={handleClick}>Click me</button>
```

### 2. ARIA Labels

```typescript
// Screen reader text
<span className="sr-only">Close dialog</span>

// ARIA labels
<button aria-label="Delete task">
  <TrashIcon />
</button>

// ARIA descriptions
<input
  aria-describedby="password-hint"
  type="password"
/>
<p id="password-hint">Must be at least 8 characters</p>
```

### 3. Focus Management

```typescript
// Focus rings
<button className={cn(
  'focus:outline-none',
  'focus:ring-2 focus:ring-ring',
  'focus:ring-offset-2 focus:ring-offset-background'
)}>
  Click Me
</button>

// Focus visible (only show ring on keyboard focus)
<a className="focus-visible:ring-2 focus-visible:ring-ring">
  Link
</a>
```

### 4. Keyboard Navigation

```typescript
// Handle keyboard events
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Custom Button
</div>
```

### 5. Color Contrast

```typescript
// Use semantic colors with sufficient contrast
<div className="bg-background text-foreground">  {/* WCAG AA compliant */}
  <p className="text-muted-foreground">Description</p>  {/* WCAG AA compliant */}
</div>
```

---

## 🧪 Component Testing Patterns

### Testing UI Components

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

---

## 📚 Component Checklist

When creating a new component, ensure:

- [ ] Uses `React.forwardRef` for ref forwarding
- [ ] Sets `displayName` for debugging
- [ ] Uses `cn()` for className merging
- [ ] Accepts `className` prop for customization
- [ ] Spreads `...props` for flexibility
- [ ] Includes TypeScript types
- [ ] Has focus styles for accessibility
- [ ] Uses semantic HTML elements
- [ ] Handles keyboard interactions
- [ ] Provides ARIA labels where needed
- [ ] Uses CSS variables for theming
- [ ] Follows existing naming conventions

---

## 🔗 Related Documentation

- **[Frontend Architecture](./architecture.md)** - Electron architecture and React patterns
- **[Frontend Overview](./README.md)** - High-level overview and getting started

---

## 📚 External Resources

- [Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [class-variance-authority](https://cva.style/docs)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [React forwardRef](https://react.dev/reference/react/forwardRef)

**Happy coding! 🎨**
