# Pipeline Design System — Internal Style Reference

Use this reference when building or restyling any page to match the Pipeline (deals-v2) visual language. Every value below is the exact Tailwind class string used in production.

---

## Page Layout

```
Container:      max-w-7xl mx-auto
Padding:        p-4 md:p-6
Vertical gap:   space-y-5
```

---

## Page Header

```
Title:          text-[26px] font-bold
Subtitle:       text-[16px] text-muted-foreground mt-0.5
Layout:         flex items-center justify-between
```

Primary action button (top-right):
```
text-[18px] px-5 py-2.5 h-auto
Icon inside:    h-5 w-5 mr-1.5
```

---

## Card Containers

All major sections (toolbar, table, KPI strip) use this card pattern:

```
bg-card border rounded-[10px] shadow-sm overflow-hidden
```

Internal section padding (toolbar, footer):
```
px-4 py-3
```

Internal divider between sections:
```
border-t border-border/50
```

---

## Summary / KPI Cards

Grid layout:
```
grid grid-cols-2 md:grid-cols-4 gap-4
```

Individual card:
```
bg-card border rounded-[10px] px-5 py-4 text-left transition-all cursor-pointer
```

States:
```
Default border:   border-border
Hover:            hover:border-primary hover:shadow-[0_0_0_1px] hover:shadow-primary/30
Active/selected:  border-primary bg-blue-50/50 shadow-[0_0_0_1px] shadow-primary/30
```

Typography:
```
Icon:       h-3.5 w-3.5 text-muted-foreground
Label:      text-[14px] font-medium text-muted-foreground
Value:      text-[26px] font-bold text-foreground
Subtitle:   text-[13px] text-muted-foreground mt-0.5
```

Icon + label row:
```
flex items-center gap-2 mb-1
```

---

## Toolbar / Search Bar

Wrapper (inside a card container):
```
px-4 py-3
```

Top row layout:
```
flex items-center justify-between gap-4
```

Search input:
```
Input:       pl-9 h-9 text-[16px]
Container:   relative max-w-[320px] w-[320px]
Search icon: absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground
```

Filter toggle link:
```
text-[16px] font-medium text-blue-600 hover:text-blue-700 transition-colors
Chevron:     h-3.5 w-3.5 transition-transform duration-200  (rotate-90 when open)
```

Sort button:
```
h-9 px-3 text-[16px] font-medium border rounded-md bg-white hover:bg-gray-50 transition-colors
Icon:        h-3.5 w-3.5
```

View toggle group:
```
Container:   flex items-center border rounded-md overflow-hidden
Each button: h-9 w-9 transition-colors
Active:      bg-blue-600 text-white
Inactive:    bg-white text-gray-500 hover:bg-gray-50
Separator:   border-l (on 2nd+ buttons)
Icon:        h-4 w-4
```

---

## Filter Panel

Opens below toolbar with animation:
```
mt-3 pt-3 border-t border-border/50 animate-in slide-in-from-top-1 duration-200
```

Header row:
```
flex items-center justify-between mb-3
Title:       text-[16px] font-semibold
Clear link:  text-[14px] text-blue-600 hover:text-blue-700 transition-colors
```

Filter grid:
```
grid grid-cols-4 gap-x-4 gap-y-3
```

Filter field label:
```
text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block
```

Select / Input controls:
```
w-full h-9 px-3 text-[16px] border rounded-md bg-white text-foreground
```

---

## Data Table

Table header row:
```
<tr>:        border-b-2
<th>:        text-left px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground
```

Table body cells — font hierarchy:
```
Primary text:      text-[16px]                              (address, borrower name)
Primary bold:      text-[16px] font-medium                  (borrower name, loan #)
Primary link:      text-[16px] font-medium text-blue-600    (loan number / clickable ID)
Money value:       text-[16px] font-semibold                (loan amount)
Secondary text:    text-[13px] text-muted-foreground        (email, city/state, sub-info)
```

Cell padding:
```
px-3 py-3
```

---

## Avatars (Borrower Initials)

Size and shape:
```
h-8 w-8 rounded-md flex items-center justify-center text-[13px] font-semibold shrink-0
```

Color palette (6 deterministic colors, hashed from name):
```
{ bg: "bg-blue-100",    text: "text-blue-600"    }
{ bg: "bg-emerald-100", text: "text-emerald-600" }
{ bg: "bg-red-100",     text: "text-red-500"     }
{ bg: "bg-amber-100",   text: "text-amber-600"   }
{ bg: "bg-purple-100",  text: "text-purple-600"  }
{ bg: "bg-teal-100",    text: "text-teal-600"    }
```

Initials logic: first letter of each word, uppercase, max 2 chars.

Name + email layout:
```
<div class="flex items-center gap-2.5">
  [avatar]
  <div>
    <div class="text-[16px] font-medium">{name}</div>
    <div class="text-[13px] text-muted-foreground">{email}</div>
  </div>
</div>
```

---

## Badges

Outline badge (program / type label):
```
<Badge variant="outline" className="text-[13px] font-medium">
```

Status badge (pill):
```
inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium
```

Status variants:
```
active:    bg-emerald-50   text-emerald-700   dot: bg-emerald-500
pending:   bg-amber-50     text-amber-700     dot: bg-amber-500
closed:    bg-blue-50      text-blue-700      dot: bg-blue-500
inactive:  bg-gray-100     text-gray-500      dot: bg-gray-400
template:  bg-amber-50     text-amber-700     dot: bg-amber-500
error:     bg-red-50       text-red-700       dot: bg-red-500
info:      bg-blue-50      text-blue-600      dot: bg-blue-500
```

---

## Row Interaction (Expandable Rows)

Hover:
```
cursor-pointer transition-colors hover:bg-blue-50/50
```

Expanded state:
```
bg-blue-50/30
```

Expand chevron:
```
h-3.5 w-3.5 text-muted-foreground transition-transform duration-200
Expanded:  rotate-90
Column:    pl-3 pr-0 py-3 w-8
```

---

## Expanded Row / Detail Panel

Container:
```
<tr>:   bg-slate-50/80 border-b-2 border-b-blue-500
<td>:   p-0
Inner:  px-6 py-5 border-t border-border/50 animate-in slide-in-from-top-1 duration-200
```

Section grid:
```
grid grid-cols-3 gap-8
```

Section heading:
```
text-[16px] font-semibold uppercase tracking-wider text-muted-foreground mb-3
```

Key-value pair:
```
Container:    flex items-center justify-between text-[16px]
Label:        text-muted-foreground
Value:        font-semibold
Spacing:      space-y-2
```

Action bar (below detail grid):
```
mt-5 pt-4 border-t border-border/50 flex items-center gap-3
```

---

## Buttons

Primary CTA:
```
<Button size="default" className="text-[18px] shadow-md">
Icon:   h-4 w-4 ml-1  (trailing) or mr-1.5 (leading)
```

Outline / Secondary:
```
<Button variant="outline" size="default" className="text-[18px] [--button-outline:rgba(156,163,175,0.30)] border-[0.5px]">
Icon:   h-4 w-4 mr-1.5
```

Special CTA (Auto Process style):
```
h-9 px-4 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md shadow-emerald-600/30
```

Ghost button:
```
variant="ghost" size="sm"   or   variant="ghost" size="icon" className="h-8 w-8"
```

---

## Progress Bar (inline in table)

```
<Progress value={percent} className="h-1.5 flex-1" />
<span className="text-[13px] text-muted-foreground w-8 text-right">{percent}%</span>
Container:  flex items-center gap-2
Column:     w-[120px]
```

---

## Stage Progress Bar (deal detail)

Outer card:
```
bg-card border rounded-[10px] px-5 py-2.5
```

Summary text:
```
text-[18px] font-medium text-muted-foreground
Layout:  flex items-center justify-between mb-1.5
```

Stage circles:
```
w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold transition-colors
```

Circle states:
```
Completed:  bg-emerald-500 text-white           (shows Check icon h-4 w-4)
Current:    bg-primary text-white ring-2 ring-primary/20
Future:     bg-gray-100 text-gray-400
```

Stage labels:
```
text-[15px] mt-1 whitespace-nowrap max-w-[90px] truncate text-center
Current:    text-foreground font-medium
Other:      text-muted-foreground
```

Connector lines:
```
h-0.5 flex-1 rounded-full min-w-[12px]
Done:       bg-emerald-500
Pending:    bg-gray-200
```

---

## Loading State (Skeletons)

```
<div className="p-6 space-y-3">
  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
</div>
```

---

## Empty State

```
Container:   flex flex-col items-center justify-center py-12 px-6 text-center
Icon circle: w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4
Icon:        h-6 w-6 text-muted-foreground
Title:       text-[15px] font-semibold text-foreground mb-1
Description: text-[13px] text-muted-foreground max-w-sm mb-4
```

---

## Footer Bar

```
px-4 py-3 border-t text-[14px] text-muted-foreground flex items-center justify-between
Secondary:   text-[13px]
```

---

## Animation

Collapsible sections (filters, expanded rows):
```
animate-in slide-in-from-top-1 duration-200
```

Chevron rotation:
```
transition-transform duration-200
```

General transitions:
```
transition-colors
transition-all
```

---

## Font Size Quick Reference

| Role                    | Size          | Weight         | Color                    |
|-------------------------|---------------|----------------|--------------------------|
| Page title              | text-[26px]   | font-bold      | (default foreground)     |
| KPI value               | text-[26px]   | font-bold      | text-foreground          |
| Primary CTA button      | text-[18px]   | —              | —                        |
| Stage summary text      | text-[18px]   | font-medium    | text-muted-foreground    |
| Body / cell text        | text-[16px]   | —              | (default foreground)     |
| Body bold               | text-[16px]   | font-medium    | (default foreground)     |
| Body money              | text-[16px]   | font-semibold  | (default foreground)     |
| Page subtitle           | text-[16px]   | —              | text-muted-foreground    |
| Toolbar controls        | text-[16px]   | font-medium    | varies                   |
| Section heading (detail)| text-[16px]   | font-semibold  | text-muted-foreground    |
| Stage circle number     | text-[15px]   | font-semibold  | varies                   |
| Stage label             | text-[15px]   | —/font-medium  | text-muted-foreground    |
| Empty state title       | text-[15px]   | font-semibold  | text-foreground          |
| KPI label               | text-[14px]   | font-medium    | text-muted-foreground    |
| Footer text             | text-[14px]   | —              | text-muted-foreground    |
| Clear link              | text-[14px]   | —              | text-blue-600            |
| Column headers          | text-[13px]   | font-semibold  | text-muted-foreground    |
| Filter labels           | text-[13px]   | font-semibold  | text-muted-foreground    |
| Secondary/sub text      | text-[13px]   | —              | text-muted-foreground    |
| Outline badge           | text-[13px]   | font-medium    | —                        |
| Avatar initials         | text-[13px]   | font-semibold  | per-color                |
| Empty state description | text-[13px]   | —              | text-muted-foreground    |
| Status badge pill       | text-[11.5px] | font-medium    | per-variant              |

---

## Color Palette Summary

| Usage             | Color                           |
|-------------------|---------------------------------|
| Primary accent    | primary / blue-600              |
| Link text         | text-blue-600                   |
| Link hover        | text-blue-700                   |
| Active selection  | bg-blue-50/50, border-primary   |
| Row hover         | bg-blue-50/50                   |
| Row expanded      | bg-blue-50/30                   |
| Detail panel bg   | bg-slate-50/80                  |
| Detail accent     | border-b-blue-500               |
| Success/complete  | emerald-500                     |
| Pending/warning   | amber-500 / amber-50            |
| Muted text        | text-muted-foreground           |
| Card background   | bg-card                         |
| Page background   | (inherits from layout)          |
| Dividers          | border-border/50                |
| Heavy dividers    | border-b-2                      |
