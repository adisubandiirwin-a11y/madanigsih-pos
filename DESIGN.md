# Design Brief

## Direction

Ledger Green — a warm, high-density counter-terminal aesthetic: paper-calm surfaces, deep forest-ink structure, and a single brass accent that always means money.

## Tone

Industrial/utilitarian with editorial restraint — a shop counter tool that stays legible under fluorescent light and fast fingers, never decorative.

## Differentiation

Every number speaks in tabular mono and every money figure wears the brass accent — the ledger reads like a real receipt, not a dashboard.

## Color Palette

| Token      | OKLCH         | Role                                             |
| ---------- | ------------- | ------------------------------------------------ |
| background | 0.985 0.004 95 | Warm ledger-paper canvas                         |
| foreground | 0.21 0.018 155 | Forest-ink text, AA+ on paper                    |
| card       | 1.0 0.002 95   | Pure paper panels for forms, tables, receipts    |
| primary    | 0.38 0.088 158 | Deep green — Simpan, navigation, structure       |
| accent     | 0.62 0.15 62   | Brass — profit, totals, money figures only       |
| muted      | 0.955 0.01 110 | Sunken rows, table stripes, inactive zones       |
| success    | 0.58 0.15 152  | Untung (profit) indicators                       |
| destructive| 0.55 0.2 27    | Rugi (loss), stock warnings, delete              |

## Typography

- Display: Space Grotesk — page titles, section headers, shop name
- Body: Figtree — labels, forms, table cells, buttons
- Mono: JetBrains Mono — all prices, quantities, totals via `.num` (tabular figures)
- Scale: hero `text-3xl md:text-4xl font-bold tracking-tight`, h2 `text-xl font-semibold`, label `.label-caps text-muted-foreground`, body `text-sm md:text-base`

## Elevation & Depth

Paper-flat base with two shadows only — `shadow-subtle` for cards/panels, `shadow-elevated` for popovers, modals, and the receipt sheet; no glow, no neon.

## Structural Zones

| Zone    | Background        | Border      | Notes                                             |
| ------- | ----------------- | ----------- | ------------------------------------------------- |
| Header  | `bg-card`         | `border-b`  | Shop name + address left, primary nav right       |
| Content | `bg-background`   | —           | Sections alternate `bg-card` panels on paper      |
| Tables  | `bg-card` rows    | `border-b`  | `bg-muted/50` header, zebra `bg-muted/30` rows    |
| Receipt | `bg-card`         | `border`    | Mono, dashed dividers, elevated sheet on overlay  |
| Footer  | `bg-muted/40`     | `border-t`  | Shop address + build note, small text             |

## Spacing & Rhythm

Compact 4px base grid; `gap-3`/`gap-4` inside forms and table cells, `space-y-6` between sections, `p-4 md:p-6` panel padding — dense enough for a laptop counter, breathable on phone.

## Component Patterns

- Buttons: `rounded-md`, primary green solid for Simpan; brass outline for money actions (Cetak Struk, Kirim WA); ghost for Edit/Cari; hover darkens one L step
- Cards: `rounded-lg bg-card border shadow-subtle`; panels never float without a border
- Badges: pill `rounded-full`, muted for stock, success/destructive for untung/rugi, accent for totals
- Inputs: `rounded-md bg-card border` with `.num` for numeric fields, visible focus ring in primary

## Motion

- Entrance: `animate-slide-up` 0.3s on panel mount; `animate-fade-in` 0.25s on table rows
- Hover: `transition-smooth` color/border shifts only, no transforms on dense tables
- Decorative: `animate-flash-in` 0.18s for save confirmation and receipt reveal

## Constraints

- Bahasa Indonesia for all UI copy; shop name "Toko Madanigsih Stationery", address "Jl. Belakang Terminal Pakupatan Serang"
- All prices, quantities, and totals MUST use `.num` (tabular mono) for column alignment
- Accent brass reserved for money/profit figures — never for generic buttons or decoration
- `chart-1..5` variables must keep working for the monthly profit chart
- Token-only styling: no hex, rgb, or arbitrary color classes in components
- Preserve existing OG/Twitter meta tags in `index.html`

## Signature Detail

The `.num` tabular-mono treatment on every figure with brass accent on profit — the interface reads like a printed ledger receipt, which is exactly what a stationery shop owner trusts.
