# CLAUDE.md - react-native-tree-multi-select

## Project Overview

React Native tree view component library (npm: `react-native-tree-multi-select`, v3.0.0-beta.3) with drag-and-drop reordering, tri-state multi-selection, and search filtering. Targets iOS, Android, and Web (React Native Web). Author: Jairaj Jangle. MIT license.

The library renders arbitrarily nested tree data in a virtualized `FlashList`, supports long-press drag-and-drop with physics-based UX (auto-scroll, magnetic snap, auto-expand), tri-state checkbox propagation (parent/child), and text-based filtering. All state is managed per-instance via Zustand stores.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode, `noUncheckedIndexedAccess`) |
| UI Framework | React Native (peer dep: any version) |
| List Rendering | `@shopify/flash-list` (peer dep: 1.x or 2.x) |
| State Management | Zustand 5 (per-instance store pattern) |
| Checkbox | `@futurejj/react-native-checkbox` |
| Deep Equality | `fast-is-equal` |
| Animations | React Native built-in `Animated` API (NOT reanimated) |
| Icons | `@expo/vector-icons/FontAwesome` OR `react-native-vector-icons` (optional peer dep) |
| Build | `react-native-builder-bob` (ESM modules + TypeScript declarations) |
| Package Manager | Yarn 4.9.2 via Corepack (monorepo with workspaces) |
| Testing | Jest 29 + `@testing-library/react-native` + `ts-jest` |
| Linting | ESLint (`@react-native-community` config) + Prettier |
| Pre-commit | Lefthook (tests + lint + typecheck + commitlint) |
| CI | GitHub Actions (lint, test, build-library, build-web, publish-npm) |
| Release | `semantic-release` (angular preset) on main/beta branches |
| Node | v24.13.0 (`.nvmrc`) |

---

## Directory Structure

```
/
├── src/                          # Library source (this is what gets published)
│   ├── TreeView.tsx              # Main component (forwardRef, imperative API)
│   ├── index.tsx                 # Public exports
│   ├── components/
│   │   ├── NodeList.tsx          # FlashList wrapper + Node renderer (~591 lines, core rendering)
│   │   ├── CheckboxView.tsx      # Built-in tri-state checkbox
│   │   ├── CustomExpandCollapseIcon.tsx  # FontAwesome caret icon
│   │   ├── DragOverlay.tsx       # Animated ghost node during drag
│   │   # (drop indicators are rendered by NodeDropIndicator inside NodeList.tsx)
│   ├── hooks/
│   │   ├── useDragDrop.ts        # Complete drag-and-drop implementation (~972 lines)
│   │   └── useScrollToNode.ts    # Imperative scroll-to-node with expansion
│   ├── helpers/
│   │   ├── toggleCheckbox.helper.ts    # Tri-state selection propagation logic
│   │   ├── expandCollapse.helper.ts    # Expand/collapse with ancestor/descendant handling
│   │   ├── moveTreeNode.helper.ts      # Immutable tree reorder (deep clone + insert)
│   │   ├── flattenTree.helper.ts       # DFS flatten for FlashList rendering
│   │   ├── search.helper.ts            # Case-insensitive tree filtering
│   │   ├── selectAll.helper.ts         # Bulk select/unselect operations
│   │   ├── treeNode.helper.ts          # nodeMap + childToParentMap initialization
│   │   └── index.ts                    # Re-exports all helpers
│   ├── store/
│   │   └── treeView.store.ts     # Zustand store factory (per-instance)
│   ├── types/
│   │   ├── treeView.types.ts     # All public types (~370 lines)
│   │   └── dragDrop.types.ts     # Drag-drop event/target types
│   ├── utils/
│   │   ├── useDeepCompareEffect.ts  # Deep-equality effect hook
│   │   ├── usePreviousState.ts      # Previous render value hook
│   │   └── typedMemo.ts            # Generic-safe React.memo wrapper
│   ├── constants/
│   │   ├── treeView.constants.ts   # defaultIndentationMultiplier=15, listHeaderFooterPadding=5
│   │   └── tests.constants.ts      # testStoreId for tests
│   ├── __tests__/                # 19 test files (see Testing section)
│   ├── __mocks__/
│   │   ├── generateTree.mock.ts  # tree3d2b fixture + generateTree() factory
│   │   └── zustand.ts           # Auto-resetting Zustand mock for tests
│   └── jest.setup.ts            # RNTL config with RN 0.78+ host component mapping
├── example/                      # Expo example app (workspace)
│   ├── src/
│   │   ├── App.tsx              # Navigation setup (ShowcaseApp)
│   │   ├── screens/             # 13+ demo screens (default, custom, drag-drop, propagation)
│   │   ├── components/          # Custom demo components
│   │   └── utils/sampleDataGenerator.ts  # Procedural tree generation
│   ├── metro.config.js          # Reanimated-wrapped metro config
│   ├── babel.config.js          # Expo preset + reanimated plugin
│   └── app.json                 # Expo config (new arch enabled, react compiler)
├── lib/                          # Build output (generated, gitignored)
├── .github/
│   ├── workflows/ci.yml         # CI pipeline (lint → test → build → publish)
│   ├── actions/setup/action.yml  # Shared setup (corepack + yarn cache)
│   └── dependabot.yml           # Monthly dependency updates
├── package.json                  # Monorepo root, all configs inline
├── tsconfig.json                 # Strict TS config (ESNext, jsx: react-jsx)
├── tsconfig.build.json           # Build config (excludes example/)
├── babel.config.js               # Root babel (builder-bob preset)
├── lefthook.yml                  # Pre-commit: test + lint + typecheck + commitlint
├── release.config.js             # semantic-release (angular, co-author extraction)
├── .editorconfig                 # 2 spaces, LF, UTF-8
└── .nvmrc                        # v24.13.0
```

---

## Architecture & Design Patterns

### 1. Per-Instance Zustand Store

Each `<TreeView>` creates its own Zustand store keyed by React's `useId()`. Stores are cached in a module-level `Map<string, StoreApi>`. Cleanup via `deleteTreeViewStore(id)` on unmount. This enables multiple independent TreeView instances in a single app.

```
getTreeViewStore(storeId) → creates or returns cached store
useTreeViewStore(storeId) → React hook for subscribing to store
```

### 2. Filter → Flatten → Render Pipeline

```
TreeNode[] (raw data)
  → getFilteredTreeData(nodes, searchText, searchKeys)  // filter by search
  → getFlattenedTreeData(filteredTree, expandedSet)      // DFS flatten only expanded
  → FlashList renders flat array with level-based indentation
```

Both filter and flatten are memoized (`useMemo`). Flattening depends on the `expanded` set from the store.

### 3. Stack-Based DFS (No Recursion)

All tree traversals use iterative stack-based DFS to avoid call stack limits on deep trees: `flattenTree`, `initializeNodeMaps`, `expandNodes`, `collapseNodes`.

### 4. Immutable Tree Mutations

`moveTreeNode()` deep-clones the entire tree, removes the dragged node, inserts at the new position, and returns the new tree reference. Never mutates in-place.

### 5. Ref-Based Mutable State for Drag

The drag-drop hook (`useDragDrop`) uses refs extensively to avoid stale closure values in `PanResponder` callbacks and to prevent unnecessary re-renders during high-frequency gesture updates. `Animated.Value` is used for overlay position (synchronous, no re-render).

### 6. Milestone-Based Async Coordination

`useScrollToNode` uses a two-milestone system (`EXPANDED` → `RENDERED`) to wait for tree expansion to propagate through React's render cycle before scrolling to a node index.

### 7. Selection Propagation

Tri-state checkbox logic with configurable propagation:
- `toChildren: true` → checking parent checks all descendants
- `toParents: true` → checking all children checks parent; partial → indeterminate
- Parent states derived bottom-up by depth after each toggle
- `recalculateCheckedStates()` recalculates after structural changes (drag-drop)

### 8. Component Memoization

`typedMemo` (generic-safe `React.memo`) wraps: TreeView, NodeList, Node, CheckboxView, CustomExpandCollapseIcon, DragOverlay. Node uses shallow equality on checkbox value + text only.

---

## Component Hierarchy

```
<TreeView>                          # Store init, imperative API, callbacks
  <NodeList>                        # Filter, flatten, FlashList, drag-drop
    <FlashList>                     # Virtualized rendering
      <Node>  [×N]                  # Per-item renderer (memoized)
        <CheckboxView>              # (or custom CheckboxComponent)
        <ExpandCollapseTouchable>   # (or custom)
          <ExpandCollapseIcon>      # (or custom)
        <NodeDropIndicator>         # Drop target visual (or custom)
        [or CustomNodeRowComponent] # Replaces entire row if provided
    <DragOverlay>                   # Animated ghost during drag
```

---

## State Shape (Zustand Store)

```typescript
{
  checked: Set<ID>,              // Selected node IDs
  indeterminate: Set<ID>,        // Partially-selected parent IDs
  expanded: Set<ID>,             // Expanded node IDs
  initialTreeViewData: TreeNode<ID>[],  // Current tree structure
  nodeMap: Map<ID, TreeNode<ID>>,       // ID → node lookup
  childToParentMap: Map<ID, ID>,        // Child ID → parent ID
  searchText: string,
  searchKeys: string[],                 // Default: ["name"]
  innerMostChildrenIds: ID[],           // Leaf nodes in filtered view
  selectionPropagation: { toChildren: true, toParents: true },
  // Drag-drop state:
  draggedNodeId: ID | null,
  invalidDragTargetIds: Set<ID>,
  dropTargetNodeId: ID | null,
  dropPosition: "above" | "below" | "inside" | null,
  dropLevel: number | null,
}
```

---

## Drag-and-Drop System (useDragDrop.ts)

The drag-and-drop system is the most complex part of the codebase (~972 lines). Key mechanics:

### Gesture Detection
- Long-press (default 400ms) initiates drag
- `canDrag()` callback consulted before starting
- Dragged node auto-collapsed at drag start

### Overlay Positioning
- `Animated.Value` for `overlayY`/`overlayX` (no re-renders)
- `dragOverlayOffset` (default -2 item heights) positions overlay above finger

### Drop Target Calculation
- **Item thirds**: <15% = "above", 15-85% = "inside", >85% = "below"
- **Horizontal control at level cliffs**: dragging left exits deep indentation
- **Redundancy suppression**: "below" → "inside" when target is expanded parent with no cliff
- **Hysteresis**: prevents flickering at same-level boundaries
- **Validation**: no self-drop, no descendant drop, maxDepth check, canDrop/canNodeHaveChildren

### Auto-Scroll
- RAF-based continuous loop at list edges
- Threshold: 60px from edge (configurable)
- Speed varies by proximity, scaled by `autoScrollSpeed`
- Delta-based positioning (not absolute)

### Auto-Expand
- Hovering "inside" collapsed node for 800ms (configurable) → auto-expand
- Auto-expanded nodes collapsed on drag end (unless ancestor of drop target)

### Magnetic Snap
- `Animated.spring` on `overlayX` when effective drop level changes
- Spring: speed 40, bounciness 4

### Post-Drop
1. `moveTreeNode()` creates new tree
2. Reinitialize node maps
3. Recalculate parent checked states
4. Expand drop target (if "inside") and ancestors
5. Set `internalDataRef` to prevent `useDeepCompareEffect` reinit
6. Call `onDragEnd` callback with `{ draggedNodeId, targetNodeId, position, newTreeData }`
7. Scroll to dropped node if outside viewport
8. Collapse auto-expanded nodes not in ancestor chain

---

## Key Constants & Defaults

| Constant | Value | Location |
|----------|-------|----------|
| `defaultIndentationMultiplier` | 15px | `constants/treeView.constants.ts` |
| `listHeaderFooterPadding` | 5px | `constants/treeView.constants.ts` |
| `estimatedItemSize` | 36px | `NodeList.tsx` (FlashList) |
| `drawDistance` | 50px | `NodeList.tsx` (FlashList) |
| `longPressDuration` | 400ms | `NodeList.tsx` defaults |
| `autoScrollThreshold` | 60px | `NodeList.tsx` defaults |
| `autoScrollSpeed` | 1.0 | `NodeList.tsx` defaults |
| `dragOverlayOffset` | -2 items | `NodeList.tsx` defaults |
| `autoExpandDelay` | 800ms | `NodeList.tsx` defaults |
| `draggedNodeOpacity` | 0.3 | `NodeList.tsx` defaults |
| `invalidTargetOpacity` | 0.3 | `NodeList.tsx` defaults |
| Drop indicator line color | `#0078FF` | `NodeList.tsx` NodeDropIndicator |
| Drop indicator highlight | `rgba(0, 120, 255, 0.15)` | `NodeList.tsx` NodeDropIndicator |
| Drag overlay background | `rgba(255, 255, 255, 0.95)` | `DragOverlay.tsx` |
| Drag overlay elevation | 10 (Android) | `DragOverlay.tsx` |

---

## Public API

### Exports (from `src/index.tsx`)

- `TreeView` - Main component
- `CheckboxView` - Built-in checkbox (can be used standalone)
- `moveTreeNode(data, draggedId, targetId, position)` - Programmatic tree reorder
- `deleteTreeViewStore(id)` - Cleanup store for unmounted TreeView
- All type exports (see Types section)

### TreeViewRef (Imperative Methods)

```typescript
ref.selectAll()              // Check all nodes
ref.unselectAll()            // Uncheck all nodes
ref.selectAllFiltered()      // Check only visible (filtered) leaf nodes
ref.unselectAllFiltered()    // Uncheck only visible leaf nodes
ref.selectNodes(ids)         // Check specific nodes (with propagation)
ref.unselectNodes(ids)       // Uncheck specific nodes (with propagation)
ref.expandAll()              // Expand all parent nodes
ref.collapseAll()            // Collapse all nodes
ref.expandNodes(ids)         // Expand specific nodes + their ancestors
ref.collapseNodes(ids)       // Collapse specific nodes + their descendants
ref.setSearchText(text, keys?)  // Filter tree (keys default: ["name"])
ref.scrollToNodeID(params)   // Scroll to node with auto-expansion
ref.getChildToParentMap()    // Get child→parent ID mapping
ref.moveNode(nodeId, targetId, position)  // Programmatic drag-drop
```

### Key Props (TreeViewProps)

```typescript
data: TreeNode<ID>[]                    // Tree data (required)
onCheck?(checkedIds, indeterminateIds)  // Selection change callback
onExpand?(expandedIds)                  // Expansion change callback
preselectedIds?: ID[]                   // Initially checked nodes
preExpandedIds?: ID[]                   // Initially expanded nodes
selectionPropagation?: { toChildren?: boolean, toParents?: boolean }
indentationMultiplier?: number          // px per level (default: 15)
initialScrollNodeID?: ID                // Scroll to on mount
treeFlashListProps?: FlashListProps     // Pass-through to FlashList
// Customization:
CheckboxComponent?: ComponentType<CheckBoxViewProps>
ExpandCollapseIconComponent?: ComponentType<ExpandIconProps>
ExpandCollapseTouchableComponent?: ComponentType<TouchableOpacityProps>
CustomNodeRowComponent?: ComponentType<NodeRowProps<ID>>
checkBoxViewStyleProps?: BuiltInCheckBoxViewStyleProps
// Drag-and-drop:
dragAndDrop?: DragAndDropOptions<ID>
```

### DragAndDropOptions

```typescript
enabled?: boolean                     // Default: true when dragAndDrop provided
onDragStart?(event: DragStartEvent<ID>)
onDragEnd?(event: DragEndEvent<ID>)   // event.newTreeData has reordered tree
onDragCancel?(event: DragCancelEvent<ID>)
longPressDuration?: number            // ms (default: 400)
autoScrollThreshold?: number          // px (default: 60)
autoScrollSpeed?: number              // multiplier (default: 1.0)
dragOverlayOffset?: number            // item heights (default: -2)
autoExpandDelay?: number              // ms (default: 800)
maxDepth?: number                     // Max nesting depth constraint
canDrop?(draggedNode, targetNode, position): boolean
canNodeHaveChildren?(node): boolean
canDrag?(node): boolean
customizations?: DragDropCustomizations<ID>
```

---

## Type System

### Core Types

```typescript
interface TreeNode<ID = string> {
  id: ID;
  name: string;
  children?: TreeNode<ID>[];
  [key: string]: any;                   // Custom fields allowed
}

type CheckboxValueType = boolean | "indeterminate";
type DropPosition = "above" | "below" | "inside";

interface SelectionPropagation {
  toChildren?: boolean;                 // Default: true
  toParents?: boolean;                  // Default: true
}
```

### Event Types

```typescript
interface DragStartEvent<ID> { draggedNodeId: ID }
interface DragCancelEvent<ID> { draggedNodeId: ID }
interface DragEndEvent<ID> {
  draggedNodeId: ID;
  targetNodeId: ID;
  position: DropPosition;
  newTreeData: TreeNode<ID>[];          // Full reordered tree
}
```

### Customization Types

```typescript
interface NodeRowProps<ID>              // Props for CustomNodeRowComponent
interface CheckBoxViewProps             // Props for CheckboxComponent
interface ExpandIconProps               // Props for ExpandCollapseIconComponent
interface DragHandleProps               // Touch handlers for drag handle
interface DragOverlayComponentProps<ID> // Props for custom drag overlay
interface DropIndicatorComponentProps   // Props for custom drop indicator
interface DragOverlayStyleProps         // Styles for drag overlay
interface DropIndicatorStyleProps       // Styles for drop indicator
interface BuiltInCheckBoxViewStyleProps // Styles for built-in checkbox
```

---

## Testing

### Test Infrastructure

- **Framework**: Jest 29 with `react-native` preset
- **Component testing**: `@testing-library/react-native` (render, renderHook, fireEvent, act)
- **Setup**: `src/jest.setup.ts` - RNTL host component config for RN 0.78+
- **Zustand mock**: `src/__mocks__/zustand.ts` - Auto-resets all stores in `beforeEach()`
- **Test data**: `src/__mocks__/generateTree.mock.ts` - `tree3d2b` fixture (15 nodes, 3 levels, 2 breadth) + `generateTree(depth, breadth)` factory

### Test Files (19 total in `src/__tests__/`)

**Helper tests** (pure logic):
- `toggleCheckbox.helper.test.ts` - Tri-state propagation (all modes)
- `recalculateCheckedStates.test.ts` - Post-drag state recalculation
- `expandCollapse.helper.test.ts` - Expand/collapse operations
- `selectAll.helper.test.ts` - Bulk selection with filtering
- `flattenTree.helper.test.ts` - Tree flattening
- `moveTreeNode.helper.test.ts` - Tree mutation (above/below/inside)
- `search.helper.test.ts` - Tree filtering
- `treeNode.helper.test.ts` - Node map initialization

**Hook tests**:
- `useDragDrop.test.ts` - Drag-drop gestures (long-press simulation, drop targets)
- `useScrollToNode.test.ts` - Scroll-to-node with expansion milestones
- `useDeepCompareEffect.test.ts` - Deep equality hook

**Component tests**:
- `TreeView.test.tsx` - Main component + ref API
- `NodeList.test.tsx` - List rendering
- `CheckboxView.test.tsx` - Tri-state checkbox states
- `DragOverlay.test.tsx` - Drag overlay rendering
- `CustomExpandCollapseIcon.test.tsx` - Icon fallback (@expo → RN vector icons)

**Store tests**:
- `store.test.ts` - Zustand store state management
- `dragDrop.store.test.ts` - Drag-drop store state + node movement

### TestIDs Convention

- Node row: `node_row_{id}`
- Checkbox: `checkbox_{id}`
- Expand arrow: `expandable_arrow_{id}`

### Running Tests

```sh
yarn test              # Run all tests
yarn test:cov          # Run with coverage (json-summary + html)
```

---

## Code Style & Conventions

### Formatting (Prettier)

- Double quotes (`"`) - NOT single quotes
- 2-space indent, no tabs
- Trailing commas: `es5`
- `quoteProps: "consistent"`
- LF line endings
- Don't use em dash or en-dash anywhere, use hyphens

### TypeScript

- Strict mode enabled
- `noUncheckedIndexedAccess: true` - array/map access returns `T | undefined`
- `noImplicitReturns: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Generic `<ID = string>` pattern throughout for custom ID types
- `verbatimModuleSyntax: false` (allows `import type` flexibility)

### React Patterns

- `forwardRef` with `useImperativeHandle` for exposing ref API
- `typedMemo` wrapper for generic component memoization
- `useCallback` for all event handlers passed to children
- `useMemo` for expensive computations (filter, flatten)
- `useDeepCompareEffect` instead of `useEffect` when deps are objects/arrays
- Zustand `useStore` with selector functions for fine-grained subscriptions

### Naming Conventions

- Components: PascalCase (`TreeView`, `NodeList`, `CheckboxView`)
- Hooks: `use` prefix (`useDragDrop`, `useScrollToNode`)
- Helpers: `camelCase` with `.helper.ts` suffix
- Types: PascalCase with descriptive names (`TreeViewProps`, `DragEndEvent`)
- Internal types: `__DoubleUnderscore__` prefix (`__FlattenedTreeNode__`)
- Constants: `camelCase` (`defaultIndentationMultiplier`)
- Store functions: `verb` + `Noun` (`updateChecked`, `getTreeViewStore`)
- Test files: match source file name + `.test.ts(x)`

### File Organization

- One component per file (except Node is inside NodeList.tsx due to tight coupling)
- Types in dedicated `types/` directory
- Helpers are pure functions (no React, no state) in `helpers/`
- Hooks in `hooks/` directory
- Re-export barrel files (`helpers/index.ts`, `src/index.tsx`)

---

## Commit Conventions

Conventional commits (angular preset) enforced by commitlint + lefthook:

```
feat: add new feature
fix: fix a bug
refactor: code refactor
docs: documentation changes
test: add or update tests
chore: tooling, deps, CI config
```

Breaking changes: `chore!: ...` or footer `BREAKING CHANGE: ...`

Co-author trailer format (used by semantic-release for contributor extraction):
```
Co-Authored-By: Name <email>
```

---

## Pre-commit Hooks (lefthook.yml)

Runs in parallel on every commit:
1. `yarn test` - All Jest tests must pass
2. `yarn lint` - ESLint + Prettier on `*.{js,ts,jsx,tsx}`
3. `npx tsc --noEmit` - TypeScript type checking

On commit message:
- `npx commitlint --edit` - Validates conventional commit format

---

## CI/CD Pipeline (.github/workflows/ci.yml)

**Triggers**: Push to main/beta, PRs to main/beta, merge_group

**Jobs** (all on ubuntu-latest):
1. **lint**: ESLint + Prettier + TypeScript typecheck
2. **test**: Jest with coverage, badge update on default branch
3. **build-library**: `yarn prepare` (bob-builder)
4. **build-web**: Export example app for web (Expo)
5. **publish-npm**: semantic-release on main/beta only (needs all above)
   - NPM publish with OIDC provenance
   - GitHub release creation
   - CHANGELOG.md update

---

## Release Process

- **Main branch**: Stable releases to npm
- **Beta branch**: Pre-releases (`3.0.0-beta.3`)
- **semantic-release** handles: version bump, npm publish, GitHub release, CHANGELOG, git commit
- **release-it** also configured for manual releases (`yarn release`)
- Angular commit analyzer: `feat` → minor, `fix` → patch, `chore(deps)` → patch, breaking → major

---

## Development Workflow

```sh
# Setup
nvm use                            # Use .nvmrc version
corepack enable                    # Enable Yarn 4.9.2 via Corepack
yarn                               # Install all workspace dependencies

# Development
yarn example start                 # Start Metro bundler for example app
yarn example ios                   # Run example on iOS
yarn example android               # Run example on Android
yarn example web                   # Run example on Web

# Quality checks
yarn test                          # Run Jest tests
yarn test:cov                      # Run tests with coverage report
yarn typecheck                     # TypeScript type checking (no emit)
yarn lint                          # ESLint + Prettier validation
yarn lint --fix                    # Auto-fix lint issues

# Build
yarn prepare                       # Build library with bob-builder → lib/
yarn clean                         # Delete lib/ build output

# Release
yarn release                       # release-it publish workflow
```

---

## Example App

The `example/` workspace is an Expo 53 app (React 19, RN 0.79.7, new architecture enabled, React Compiler experiment on). It imports the library directly from `../src/index` via tsconfig path alias.

### Demo Screens (13+)

- **Default UI**: Small/Medium/Large data, Controls demo (all ref API methods)
- **Customizations**: Custom checkbox, custom arrow, custom row, numeric IDs
- **Selection Propagation**: Parent-only, child-only, isolated selection
- **Drag & Drop**: Basic, styled, custom overlay, custom row, undo/redo
- **Multiple Trees**: Two independent TreeView instances

### Navigation

Uses `@gorhom/showcase-template` with category-based section organization.

---

## Performance Considerations

- FlashList virtualization: `estimatedItemSize: 36`, `removeClippedSubviews: true`, `drawDistance: 50`
- Memoization at every level: `typedMemo`, `useCallback`, `useMemo`
- Zustand selectors for minimal re-renders (only subscribed state triggers update)
- Refs for high-frequency drag updates (no React re-render per gesture frame)
- `Animated.Value` for overlay position (native driver where possible)
- Stack-based DFS avoids call stack overflow on deep trees
- `useDeepCompareEffect` prevents unnecessary reinit when tree data reference changes but content doesn't
- `internalDataRef` prevents reinit after drag-drop (data changed by library, not consumer)

---

## Important Cavebase Notes

- Drop indicators are rendered by `NodeDropIndicator` inside `NodeList.tsx` (the legacy standalone `DropIndicator.tsx` was removed)
- The library does NOT use `react-native-reanimated` (the example app does for its own needs)
- `__FlattenedTreeNode__<ID>` is the internal extended type with `level` field added during flattening
- The `isExpanded` prop on `DragOverlay` is always `false` because nodes are collapsed at drag start
- Drag-and-drop is disabled while a search filter is active (filtered-list drop targets vs full-tree insertion would be ambiguous); use the `moveNode` ref method instead
- Web drag-and-drop support is WIP (noted in README)
- The `wasDraggedRef` in Node component prevents checkbox/expand clicks immediately after drag ends
