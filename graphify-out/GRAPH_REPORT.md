# Graph Report - .  (2026-07-25)

## Corpus Check
- Corpus is ~37,485 words - fits in a single context window. You may not need a graph.

## Summary
- 670 nodes · 831 edges · 56 communities (41 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 120 input · 80 output

## Community Hubs (Navigation)
- Admin API Client & Data Types
- Admin Student Detail View
- Admin Student Management Table
- ESLint Configuration & Tooling
- Core Dependencies & UI Packages
- TypeScript App Compiler Config
- Admin Teacher Management & Creation
- Admin Schedule Session Details
- Admin Teacher Profile & Availability
- Admin Schedule & Master Calendar
- Student Activity & Access Grants
- Admin Dashboard Metrics & Analytics
- Teacher Availability Utilities
- Package Manifest & Project Scripts
- TypeScript Node & Vite Config
- Booking Actions & Slot Formatter
- Batch Schedule Day Details
- Admin Programs & Batches Portal
- Package Mutation & Error Helpers
- Admin Batch Detail Management
- Teacher & Class Details Panels
- UI Data Card Grid Component
- UI Data Table Component
- Booking Events & Note Formatter
- App Shell Navigation & Layout
- Prettier Code Style Config
- UI Filter Select Dropdown
- UI Status Badge Component
- Student Status & Program Formatter
- Teacher Class Roster & Previews
- Zustand Theme Store
- UI Data View Toggle Controls
- UI Quiet Label Component
- Student Detail Query Parser
- UI Copy Icon Button
- UI Debounced Search Input
- UI Modal Dialog Component
- UI Table Pagination Controls
- Admin Planned Features Placeholder
- TypeScript Solution Config
- HTML App Entry Point
- Axios HTTP Client Instance
- React Query Client Setup
- React Router Configuration
- CP Hub Assets & Branding

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `formatCompactDate()` - 14 edges
3. `StudentPaymentsTab()` - 12 edges
4. `compilerOptions` - 10 edges
5. `createStudentClassRows()` - 9 edges
6. `formatDate()` - 9 edges
7. `scripts` - 8 edges
8. `ScheduleBatchModal()` - 8 edges
9. `SlotsPanel()` - 8 edges
10. `getErrorMessage()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ScheduleBatchModal()` --indirect_call--> `getAdminBatchScheduleDefaults()`  [INFERRED]
  src/features/admin/AdminSchedulePage.tsx → src/features/admin/api.ts
- `ScheduleDefaultsModal()` --indirect_call--> `getAdminBatchScheduleDefaults()`  [INFERRED]
  src/features/admin/AdminSchedulePage.tsx → src/features/admin/api.ts
- `TeacherHeader()` --calls--> `getErrorMessage()`  [EXTRACTED]
  src/features/admin/teachers/AdminTeacherDetailPage.tsx → src/features/admin/teachers/teacher-utils.ts
- `ClassDetails()` --calls--> `getErrorMessage()`  [EXTRACTED]
  src/features/admin/teachers/AdminTeacherDetailPage.tsx → src/features/admin/teachers/teacher-utils.ts
- `RosterRow()` --calls--> `formatDateTime()`  [EXTRACTED]
  src/features/admin/teachers/AdminTeacherDetailPage.tsx → src/features/admin/teachers/teacher-utils.ts

## Import Cycles
- None detected.

## Communities (56 total, 15 thin omitted)

### Community 0 - "Admin API Client & Data Types"
Cohesion: 0.01
Nodes (67): AdminBatchGroupListParams, AdminBookingListParams, AdminClassActivityRead, AdminClassRosterBookingRead, AdminClassSessionListParams, AdminDashboardSummary, AdminPackageListParams, AdminStudentAccessGrantCreatePayload (+59 more)

### Community 1 - "Admin Student Detail View"
Cohesion: 0.04
Nodes (23): accessGrantTypeOptions, ActivityRowData, ApiMutationError, BookingActionMode, classFilters, createBatchGroupMap(), dateFormatter, FinanceBriefing (+15 more)

### Community 2 - "Admin Student Management Table"
Cohesion: 0.07
Nodes (36): AccessCell(), accessOptions, AdminStudentsPage(), ApiMutationError, ClassPreviewList(), columnHelper, createBatchGroupOptions(), createPackageOptions() (+28 more)

### Community 3 - "ESLint Configuration & Tooling"
Cohesion: 0.05
Nodes (43): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, openapi-typescript, devDependencies (+35 more)

### Community 4 - "Core Dependencies & UI Packages"
Cohesion: 0.06
Nodes (31): axios, class-variance-authority, clsx, date-fns, lucide-react, dependencies, axios, class-variance-authority (+23 more)

### Community 5 - "TypeScript App Compiler Config"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl (+16 more)

### Community 6 - "Admin Teacher Management & Creation"
Cohesion: 0.13
Nodes (14): AdminTeachersPage(), columnHelper, CreateStep, CreateTeacherModal(), getFilters(), parseCreateStep(), RuleDraft, sortOptions (+6 more)

### Community 7 - "Admin Schedule Session Details"
Cohesion: 0.13
Nodes (10): AdminScheduleDetailPage(), formatDateTime(), formatEvent(), parseTab(), SessionActivity(), SessionHeader(), SessionOverview(), SessionSummary() (+2 more)

### Community 8 - "Admin Teacher Profile & Availability"
Cohesion: 0.12
Nodes (9): AdminTeacherDetailPage(), AvailabilityView, ClassFilter, classParams(), DetailTab, parseClassFilter(), parseTab(), slotParams() (+1 more)

### Community 9 - "Admin Schedule & Master Calendar"
Cohesion: 0.16
Nodes (13): AdminSchedulePage(), column, dateWindow(), formatUtcDate(), localDateTime(), optionFromDefault(), replaceDate(), ScheduleBatchModal() (+5 more)

### Community 10 - "Student Activity & Access Grants"
Cohesion: 0.17
Nodes (19): AccessGrantHistoryRow(), BatchMembershipRow(), createActivityRows(), createFinanceBriefing(), createOverviewAlerts(), createPackageOptions(), CurrentAccessCard(), formatAccessGrant() (+11 more)

### Community 11 - "Admin Dashboard Metrics & Analytics"
Cohesion: 0.16
Nodes (15): AdminDashboard(), currencyFormatter, DashboardSummary(), DashboardWindowPreset, FocusItem(), formatLocalDateTime(), formatLocalWindow(), formatMinorCurrency() (+7 more)

### Community 12 - "Teacher Availability Utilities"
Cohesion: 0.15
Nodes (16): AvailabilitySlotStatus, ClassRow(), getClassDateParts(), getLocalWeekday(), SlotsPanel(), dateFormatter, dateTimeFormatter, dayForIndex (+8 more)

### Community 13 - "Package Manifest & Project Scripts"
Cohesion: 0.13
Nodes (14): name, overrides, js-yaml, private, scripts, build, dev, generate:api (+6 more)

### Community 14 - "TypeScript Node & Vite Config"
Cohesion: 0.14
Nodes (13): ES2023, vite.config.ts, compilerOptions, allowSyntheticDefaultImports, lib, module, moduleResolution, noEmit (+5 more)

### Community 15 - "Booking Actions & Slot Formatter"
Cohesion: 0.18
Nodes (14): BookingActionsPanel(), createClassPreviewRows(), createStudentClassRows(), formatAvailabilitySlotOption(), formatBatchSlot(), formatBookingStatus(), formatClassOwner(), formatClassSessionStatus() (+6 more)

### Community 16 - "Batch Schedule Day Details"
Cohesion: 0.20
Nodes (4): AdminBatchScheduleDayDetailPage(), formatDate(), formatTime(), OptionRow()

### Community 17 - "Admin Programs & Batches Portal"
Cohesion: 0.26
Nodes (10): AdminProgramsPage(), BatchCard(), batchColumn, CreateProgramModal(), formatDate(), formatMoney(), PackageCard(), packageColumn (+2 more)

### Community 18 - "Package Mutation & Error Helpers"
Cohesion: 0.20
Nodes (12): ActionError(), createPackageMap(), getAccessGrantPackageLabel(), getLocalDateTimeInputValue(), getMutationErrorMessage(), getPaymentPackageLabel(), localDateTimeInputToIso(), StudentAccessTab() (+4 more)

### Community 19 - "Admin Batch Detail Management"
Cohesion: 0.22
Nodes (4): AdminBatchDetailPage(), formatDate(), Tab, tabs

### Community 20 - "Teacher & Class Details Panels"
Cohesion: 0.25
Nodes (8): ClassDetails(), RulesPanel(), TeacherHeader(), TeacherSummary(), browserTimeZone(), getErrorMessage(), localRuleToUtc(), utcRuleToLocal()

### Community 23 - "Booking Events & Note Formatter"
Cohesion: 0.33
Nodes (6): BookingEventRow(), BookingNoteRow(), formatBookingEventType(), formatBookingNoteVisibility(), formatDateTime(), StudentClassRowDetails()

### Community 24 - "App Shell Navigation & Layout"
Cohesion: 0.33
Nodes (3): adminLinks, portalLinks, RailLink

### Community 25 - "Prettier Code Style Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 26 - "UI Filter Select Dropdown"
Cohesion: 0.40
Nodes (3): allOption, FilterSelectOption, FilterSelectProps

### Community 27 - "UI Status Badge Component"
Cohesion: 0.40
Nodes (3): StatusBadgeProps, StatusBadgeTone, statusBadgeToneClassNames

### Community 28 - "Student Status & Program Formatter"
Cohesion: 0.40
Nodes (5): formatProgram(), formatStatus(), ProgramChangeRow(), StudentSideSummary(), StudentStatusBadge()

### Community 29 - "Teacher Class Roster & Previews"
Cohesion: 0.40
Nodes (5): Overview(), RosterRow(), TeacherClassPreviewList(), formatDateTime(), formatProgram()

### Community 30 - "Zustand Theme Store"
Cohesion: 0.50
Nodes (3): ThemeMode, ThemeState, useThemeStore

### Community 34 - "Student Detail Query Parser"
Cohesion: 0.50
Nodes (4): AdminStudentDetailPage(), getClassBookingParams(), parseClassFilter(), parseTab()

## Knowledge Gaps
- **236 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `name` (+231 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AvailabilitySlotStatus` connect `Teacher Availability Utilities` to `Admin API Client & Data Types`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `formatSlotStatus()` connect `Teacher Availability Utilities` to `Admin Teacher Profile & Availability`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getAdminBatchScheduleDefaults()` connect `Admin Schedule & Master Calendar` to `Admin API Client & Data Types`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin API Client & Data Types` be split into smaller, more focused modules?**
  _Cohesion score 0.014925373134328358 - nodes in this community are weakly interconnected._
- **Should `Admin Student Detail View` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `Admin Student Management Table` be split into smaller, more focused modules?**
  _Cohesion score 0.07053140096618357 - nodes in this community are weakly interconnected._