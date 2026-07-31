# Styling Guide for Momento Core

This guide covers UI/UX patterns and styling conventions for Momento Core.

## Design System

Momento Core uses:
- **CSS Framework**: Tailwind CSS
- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Font**: System font stack (Inter-like)

## Color Palette

### Semantic Colors

**Signal (Primary/Success)**:
- Used for: Positive signals, active states, success
- Tailwind: `bg-signal`, `text-signal`, `border-signal`
- CSS Variable: `--signal` (typically green/teal)

**Caution (Warning)**:
- Used for: Warnings, medium priority
- Tailwind: `bg-caution`, `text-caution`, `border-caution`
- CSS Variable: `--caution` (typically yellow/orange)

**Critical (Error/Danger)**:
- Used for: Errors, critical issues, destructive actions
- Tailwind: `bg-critical`, `text-critical`, `border-critical`
- CSS Variable: `--critical` (typically red)

**Info (Neutral)**:
- Used for: Information, neutral states
- Tailwind: `bg-info`, `text-info`, `border-info`
- CSS Variable: `--info` (typically blue/gray)

### Multiplier Colors

Dynamic colors based on multiplier values:

```typescript
// web/src/lib/format.ts
export function multiplierColor(multiplier: number): string {
  if (multiplier >= 50) return "#ef4444"; // red-500 (mega moonshot)
  if (multiplier >= 10) return "#f97316"; // orange-500 (moonshot)
  if (multiplier >= 5) return "#a855f7"; // purple-500 (ignition)
  if (multiplier >= 2) return "#8b5cf6"; // violet-500 (mid)
  return "#22c55e"; // green-500 (low)
}
```

### Background Colors

**Card Background**: `bg-card`
**Muted Background**: `bg-muted`
**Input Background**: `bg-background`
**Hover States**: `hover:bg-muted/50`

## Typography

### Font Sizes

**Page Title**: `text-2xl` or `text-3xl`
**Section Title**: `text-lg`
**Panel Title**: `text-sm` or `text-base`
**Body Text**: `text-sm`
**Small Text**: `text-xs` or `text-[10px]`
**Monospace**: `font-mono`

**Example**:
```tsx
<h1 className="text-2xl font-semibold">Page Title</h1>
<h2 className="text-lg font-medium">Section Title</h2>
<p className="text-sm">Body text</p>
<span className="text-xs text-muted-foreground">Small text</span>
```

### Font Weights

**Bold**: `font-semibold` (not `font-bold`)
**Medium**: `font-medium`
**Normal**: `font-normal`

### Text Colors

**Primary**: `text-foreground`
**Secondary**: `text-muted-foreground`
**Accent**: `text-signal`, `text-caution`, `text-critical`

## Spacing

### Standard Spacing

- **Section spacing**: `space-y-4` or `space-y-6`
- **Panel spacing**: `space-y-3.5`
- **Item spacing**: `gap-2` or `gap-3`
- **Tight spacing**: `gap-1` or `gap-1.5`

**Example**:
```tsx
<div className="space-y-4">
  <Section />
  <Section />
</div>

<div className="flex gap-2">
  <Button />
  <Button />
</div>
```

### Padding

- **Panel padding**: `px-3 py-2.5` (compact)
- **Card padding**: `p-4`
- **Large padding**: `p-6`

## Components

### Panel

Standard content container:

```tsx
<Panel
  title="Panel Title"
  subtitle="Optional subtitle"
  icon={<Icon className="h-3.5 w-3.5" />}
  actions={<Button>Action</Button>}
  lit // Optional: adds highlight styling
>
  {/* Content */}
</Panel>
```

**Variants**:
- Default: Standard styling
- `lit`: Highlighted with signal color border

### StatTile

Metric display:

```tsx
<StatTile
  label="Metric Name"
  value={formatValue(data.value)}
  accent="signal" // "signal", "caution", "critical", "info"
  progress={data.percentage}
  hint="Tooltip text"
  emphasis // Optional: larger display
/>
```

### Button

```tsx
<Button
  size="sm" // "sm", "default", "lg"
  variant="default" // "default", "outline", "ghost", "destructive"
  className="gap-1.5"
  disabled={loading}
>
  <Icon className="h-3.5 w-3.5" />
  Button Text
</Button>
```

**Common Patterns**:
- Primary action: `bg-signal`
- Destructive: `variant="destructive"`
- Secondary: `variant="outline"`
- Tertiary: `variant="ghost"`

### Input

```tsx
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Placeholder"
  className="font-mono text-xs"
/>
```

### Label

```tsx
<Label htmlFor="field-id" className="text-[11px] uppercase tracking-wider text-muted-foreground">
  Field Label
</Label>
```

## Layout Patterns

### AppShell

Standard page layout:

```tsx
<AppShell
  title="Page Title"
  subtitle="Optional subtitle"
  actions={<Button>Action</Button>}
  wide={false} // Optional: full width
>
  {/* Page content */}
</AppShell>
```

### Grid Layouts

```tsx
// 2-column grid
<div className="grid gap-4 sm:grid-cols-2">
  <Panel />
  <Panel />
</div>

// 4-column grid
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <StatTile />
  <StatTile />
  <StatTile />
  <StatTile />
</div>
```

### Responsive Design

**Mobile First**:
- Default: Single column
- `sm:`: Small screens (640px+)
- `md:`: Medium screens (768px+)
- `lg:`: Large screens (1024px+)
- `xl:`: Extra large (1280px+)

**Example**:
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Responsive grid */}
</div>
```

## Common UI Patterns

### Loading State

```tsx
{isLoading && (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)}
```

### Empty State

```tsx
{!data || data.length === 0 && (
  <EmptyState
    compact={false}
    title="No data"
    description="Description of why there's no data"
  />
)}
```

### Error State

```tsx
{error && (
  <div className="rounded-md border border-critical/30 bg-critical/10 px-3 py-2.5 text-[11px] text-critical">
    {error}
  </div>
)}
```

### Progress Bar

```tsx
<div className="meter-track">
  <div
    className="meter-fill"
    style={{
      width: `${percentage}%`,
      backgroundColor: percentage >= 60 ? "hsl(var(--signal))" : "hsl(var(--caution))"
    }}
  />
</div>
```

### Badge/Chip

```tsx
<span className="chip-signal">Signal</span>
<span className="chip-muted">Neutral</span>
```

## Utility Classes

### Common Utilities

**Flexbox**:
```tsx
<div className="flex items-center justify-between gap-2">
  {/* Items */}
</div>
```

**Borders**:
```tsx
<div className="rounded-md border border-border/45">
  {/* Content */}
</div>
```

**Rounded Corners**:
- `rounded-md` - Standard
- `rounded-lg` - Larger
- `rounded-full` - Circular

**Shadows**:
- `shadow-sm` - Subtle
- `shadow-md` - Standard

**Overflow**:
- `overflow-hidden` - Hide overflow
- `overflow-auto` - Scrollable
- `no-scrollbar` - Hide scrollbar (custom class)

## Custom Classes

### Meter Track/Fill

For progress bars and meters:

```css
.meter-track {
  @apply h-1.5 w-full overflow-hidden rounded-full bg-muted-foreground/20;
}

.meter-fill {
  @apply h-full rounded-full transition-all duration-300;
}
```

### Chip Styles

```css
.chip-signal {
  @apply rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-signal;
}

.chip-muted {
  @apply rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground;
}
```

### Ticker Animation

For new round flash:

```css
@keyframes ticker-in {
  0% {
    background-color: hsl(var(--signal) / 0.2);
  }
  100% {
    background-color: transparent;
  }
}

.animate-ticker-in {
  animation: ticker-in 1.4s ease-out;
}
```

## Accessibility

### Keyboard Navigation

- All interactive elements should be keyboard accessible
- Use semantic HTML (button, a, input)
- Add `aria-label` for icon-only buttons

### Screen Readers

- Use semantic headings (h1, h2, h3)
- Add `aria-live` for dynamic content
- Provide text alternatives for icons

### Focus States

- Visible focus indicators
- Logical tab order
- Skip to main content link (if needed)

## Responsive Breakpoints

```typescript
// Tailwind default breakpoints
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## Dark Mode

Momento Core uses CSS variables for theming. Dark mode is handled automatically via the color scheme.

**Color Variables**:
- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`
- `--radius`

## Best Practices

### Do's
- Use existing components when possible
- Follow the spacing system
- Use semantic colors
- Make components responsive
- Test on different screen sizes
- Consider accessibility

### Don'ts
- Don't hardcode colors (use CSS variables)
- Don't use arbitrary values unless necessary
- Don't mix spacing systems
- Don't ignore mobile layouts
- Don't skip error states
- Don't forget loading states

## Examples

### Complete Panel Example

```tsx
<Panel
  title="Round Feed"
  subtitle={`${rounds.length} in buffer`}
  icon={<List className="h-3.5 w-3.5" />}
  actions={<Button size="sm">Refresh</Button>}
>
  {rounds.length === 0 ? (
    <EmptyState compact title="No rounds" />
  ) : (
    <div className="space-y-2">
      {rounds.map(round => (
        <div key={round.id} className="flex items-center justify-between rounded-md border border-border/45 bg-muted/12 px-3 py-2.5">
          <span className="font-mono text-xs">{round.multiplier}x</span>
          <span className="text-[10px] text-muted-foreground">{round.band}</span>
        </div>
      ))}
    </div>
  )}
</Panel>
```

### Form Example

```tsx
<div className="space-y-3.5">
  <div className="space-y-1.5">
    <Label htmlFor="field">Field Label</Label>
    <Input
      id="field"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="font-mono text-xs"
    />
    <p className="text-[10px] text-muted-foreground/70">Helper text</p>
  </div>

  <Button size="sm" className="w-full">
    Submit
  </Button>
</div>
```
