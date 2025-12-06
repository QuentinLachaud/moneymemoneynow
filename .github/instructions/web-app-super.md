🚀 Architecture & Development Directive
React + Vite + TypeScript Web Application
Universal Instructions for AI Agents Working in This Repository

This file defines the mandatory development philosophy for any AI coding assistant contributing to this project.
You must read, internalize, and follow every rule before producing code, refactoring, or proposing architecture changes.

Your mission is to transform this application into a world-class, modern, elegant, modular, and maintainable React web app, with ultra-clean component architecture and frictionless extensibility.

1. 🎯 Core Objectives

Any code you generate must:

1.1. Prioritize Modern Frontend Engineering Standards

Fully typed React + TypeScript

Vite as the bundler

Component-driven, declarative UI

High-performance rendering patterns

Zero redundancy

Minimal cognitive load for future updates

1.2. Maintain a World-Class UI & UX

Minimalistic, intuitive, predictable interactions

Clean spacing, hierarchy, alignment

Consistent, reusable design tokens

Smooth micro-interactions and transitions

Zero visual noise

1.3. Maximize Maintainability

Small, cohesive modules

Explicit responsibilities

Clear boundaries

Loosely coupled, highly composable components

All logic discoverable, never buried

1.4. Leave a Trail of Intelligence

Agents MUST embed breadcrumb comments that help future agents and humans understand:

where responsibilities begin and end

why a choice was made

where things are imported from

where the component fits in the architectural map

where future hooks/components may plug in

These breadcrumbs ensure the entire codebase remains self-documenting and scalable.

2. 🧭 Architectural Principles

Agents must follow these principles rigorously.

2.1. Single Responsibility Components

Each component must do one thing extremely well, with:

zero unrelated concerns

no heavy logic inline

no unnecessary prop passing

If a component grows beyond ~150 lines, consider refactoring into child components.

2.2. Reusable Primitives → Domain Components → Page Layouts

Always think in three layers:

Layer 1: UI Primitives

Reusable building blocks, e.g.:

<Button />

<Toggle />

<Panel />

<CollapsibleTray />

<Card />

<SectionHeader />

These must be generic, not domain-specific.

Layer 2: Domain Components

Domain-aware logic using primitives, e.g.:

<PortfolioMonteCarloChart />

<CashFlowPanel />

<NetWorthBreakdown />

They combine primitives but remain modular and reusable.

Layer 3: Page Layouts

Composition only; no heavy logic.
Layouts orchestrate domain components and define adaptive layout rules.

3. 🧠 Code Quality Rules
3.1. Strict TypeScript

GENERICS where appropriate

Never use any

Prefer discriminated unions over booleans

Always type charting data, API calls, configs, and contexts

3.2. Explicit Naming

Names MUST encode intent:

Bad:

function handleClick() {}


Good:

function handleToggleSideTray() {}

3.3. Zero Magic Numbers

Store all constants in:
/src/config/constants.ts

3.4. Zero Inline Styles

Use:

Tailwind classes

or CSS modules

or style objects in dedicated files for dynamic styles

Never inline style objects inside JSX.

3.5. Cohesive State Handling

Prefer local state where possible

Use context only when shared across multiple distant layers

Never store derivable state

Keep state minimal and explicit

4. 🧵 Breadcrumb Comments (Mandatory)
Every component must contain three breadcrumb blocks:
Breadcrumb Block A — Component Compass (Top of File)

Placed at the very top of each file:

// ─────────────────────────────────────────────────────────────
// Component: PortfolioCashFlowPanel
// Purpose: Handles collapsed/expanded cash flow chart display,
//          provides Net/All toggle, exposes data + CSV controls.
// Layer: Domain Component
// Dependencies: SectionHeader, ChartContainer, NetAllToggle
// Consumed by: PortfolioPage
// ─────────────────────────────────────────────────────────────

Breadcrumb Block B — Architecture Notes (Above Key Functions)

Placed above any meaningful block of logic:

// ─────────────────────────────────────────────────────────────
// Logic: deriveNetCashFlowSeries
// Purpose: Computes net series from multiple inflow/outflow sources.
// Why here: Keeping transformation logic near rendering supports clarity.
// Future: Extract to /utils/cashflow when reused elsewhere.
// ─────────────────────────────────────────────────────────────

Breadcrumb Block C — Navigation Markers (Inside JSX Hierarchy)

Placed inside JSX tree before major subtrees:

{/* ───── Section: Header Controls (Toggle, Data, CSV, Collapse) ───── */}

{/* ───── Section: Chart Container (conditionally rendered) ───── */}

{/* ───── Section: Empty State (when no data) ───── */}


These enable extremely fast scanning when editing large components.

5. 🧩 Modularity Requirements

Agents must constantly evaluate whether:

A component does too much

A logic block should be extracted

A UI element should be made generic

A hook should be created for readability

A directory should be reorganized

Proactive modularization is REQUIRED, not optional.

Examples:

✔ Extract common collapsible behavior → useCollapsible()
✔ Extract repeated charts → <ChartBase />
✔ Extract common toggle logic → <SegmentedControl />
✔ Extract data transforms → /src/utils/finance/*.ts

6. 📁 Project Structure (Agents MUST Follow)
src/
  components/
    ui/                # Low-level primitives
    domain/            # Domain-specific composed components
    layout/            # Page-level layout components
  hooks/
  utils/
  charts/              # ChartJS or Recharts wrappers, typed
  config/
  context/
  pages/
  styles/


Agents modifying structure must update this file.

7. 🎨 Design & UI Rules
7.1. Modern Aesthetic

Minimal shadows

Rounded elements (consistent radii)

Harmonized colors

Consistent spacing scale

Balance between density and clarity

7.2. Interaction UX

All collapsible elements animate smoothly

Toggles should feel tactile

Charts should resize gracefully

Tables must never feel cramped

7.3. Accessibility

Keyboard focusability

ARIA roles

High-contrast theme elements

Semantic HTML structure

8. 🛠️ How Agents Should Work
Every AI agent must:

Plan before coding
Produce a short architectural plan before writing code.

Explain reasoning when refactoring
Include comments describing why a change improves modularity or maintainability.

Continuously scan for improvements
While reading the codebase, proactively:

break down monoliths

extract repeated UI patterns

remove duplication

simplify complex trees

Never degrade readability
No over-optimization or compression at the expense of clarity.

Test logic mentally
Confirm expected state transitions before returning code.

Preserve visual parity unless redesign requested
Functional refactors should not introduce regressions.

9. 📝 Commit-Level Guidance

Each commit generated by agents should implicitly follow:

Refactor in small, readable chunks

Never mix cosmetic and logical refactors

Include breadcrumb comments

Commit messages should follow:

feat: add CollapsibleSideTray with animation + breadcrumbs  
refactor: extract NetAllToggle into UI primitive  
fix: correct MonteCarlo chart percentile calculation  
chore: add finance utils + test scaffolding  

✔️ Final Instruction to Any Agent

You are expected to think like a senior engineer designing a long-lived, evolving codebase.
Your output must always add clarity, modularity, structure, and reusability.
Your code must always include breadcrumb comments.
Your goal is to leave the project cleaner than you found it, every single time.