jest.mock("zustand");

import { getTreeViewStore } from "../store/treeView.store";
import { tree3d2b } from "../__mocks__/generateTree.mock";
import {
  collapseAll,
  collapseNodes,
  expandAll,
  expandNodes,
  handleToggleExpand,
  initializeNodeMaps,
} from "../helpers";
import { act } from "@testing-library/react-native";
import { testStoreId } from "../constants/tests.constants";

describe("expand/collapse helpers", () => {
  const useTreeViewStore = getTreeViewStore(testStoreId);

  beforeEach(() => {
    useTreeViewStore.setState(useTreeViewStore.getState(), true);

    useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
    initializeNodeMaps(testStoreId, tree3d2b);
  });

  it("given a collapsed tree, when toggling expand on nodes, then expand/collapse lifecycle works correctly", () => {
    // Expand node 1
    act(() => {
      handleToggleExpand(testStoreId, "1");
    });

    let { expanded } = useTreeViewStore.getState();
    expect(expanded.has("1")).toBeTruthy();

    // Expand child 1.2 while parent 1 remains expanded
    act(() => {
      handleToggleExpand(testStoreId, "1.2");
    });

    expanded = useTreeViewStore.getState().expanded;
    expect(expanded.has("1.2")).toBeTruthy();
    expect(expanded.has("1")).toBeTruthy();

    // Collapse parent 1 (collapses descendants too) and expand node 2
    act(() => {
      handleToggleExpand(testStoreId, "1");
      handleToggleExpand(testStoreId, "2");
    });

    expanded = useTreeViewStore.getState().expanded;
    expect(expanded.has("1")).toBeFalsy();
    expect(expanded.has("1.1")).toBeFalsy();
    expect(expanded.has("1.2")).toBeFalsy();
    expect(expanded.has("1.2.1")).toBeFalsy();
    expect(expanded.has("2")).toBeTruthy();
  });

  it("when calling expandAll, then all nodes are expanded regardless of prior state", () => {
    // From fully collapsed
    act(() => {
      expandAll(testStoreId);
    });

    let { expanded, nodeMap } = useTreeViewStore.getState();
    let nodeKeys = new Set(nodeMap.keys());
    expect(expanded).toEqual(nodeKeys);

    // Reset and partially expand, then expandAll again
    useTreeViewStore.setState(useTreeViewStore.getState(), true);
    useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
    initializeNodeMaps(testStoreId, tree3d2b);

    act(() => {
      handleToggleExpand(testStoreId, "1");
      handleToggleExpand(testStoreId, "2");
      handleToggleExpand(testStoreId, "1.1");
      handleToggleExpand(testStoreId, "1.2");
      handleToggleExpand(testStoreId, "1.1");

      expandAll(testStoreId);
    });

    ({ expanded, nodeMap } = useTreeViewStore.getState());
    nodeKeys = new Set(nodeMap.keys());
    expect(expanded).toEqual(nodeKeys);
  });

  it("when calling collapseAll, then all nodes are collapsed regardless of prior state", () => {
    // From fully collapsed (no-op)
    act(() => {
      collapseAll(testStoreId);
    });

    let { expanded } = useTreeViewStore.getState();
    expect(expanded).toEqual(new Set<string>());

    // From partially expanded
    act(() => {
      handleToggleExpand(testStoreId, "1");
      handleToggleExpand(testStoreId, "2");
      handleToggleExpand(testStoreId, "1.1");
      handleToggleExpand(testStoreId, "1.2");
      handleToggleExpand(testStoreId, "1.1");

      collapseAll(testStoreId);
    });

    ({ expanded } = useTreeViewStore.getState());
    expect(expanded).toEqual(new Set<string>());
  });

  it("when calling expandNodes and collapseNodes, then targeted nodes and their ancestors/descendants update correctly", () => {
    // expandNodes: expand specific nodes and their ancestors
    act(() => {
      expandNodes(testStoreId, ["1", "2.1", "2.2.2"]);
    });

    const { expanded: expandedAfterExpandNodes } = useTreeViewStore.getState();
    expect(expandedAfterExpandNodes.has("1")).toBeTruthy();
    expect(expandedAfterExpandNodes.has("1.1")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("1.1.1")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("1.1.2")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("1.2")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("1.2.1")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("1.2.2")).toBeFalsy();

    expect(expandedAfterExpandNodes.has("2")).toBeTruthy();
    expect(expandedAfterExpandNodes.has("2.1")).toBeTruthy();
    expect(expandedAfterExpandNodes.has("2.1.1")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("2.1.2")).toBeFalsy();

    expect(expandedAfterExpandNodes.has("2.2")).toBeTruthy();
    expect(expandedAfterExpandNodes.has("2.2.1")).toBeFalsy();
    expect(expandedAfterExpandNodes.has("2.2.2")).toBeTruthy();

    // collapseNodes: collapse specific parent nodes and their descendants
    act(() => {
      collapseNodes(testStoreId, ["1", "2.2"]);
    });

    const { expanded: expandedAfterCollapseNodes } =
      useTreeViewStore.getState();
    expect(expandedAfterCollapseNodes.has("1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.1.1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.1.2")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.2")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.2.1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("1.2.2")).toBeFalsy();

    expect(expandedAfterCollapseNodes.has("2")).toBeTruthy();
    expect(expandedAfterCollapseNodes.has("2.1")).toBeTruthy();
    expect(expandedAfterCollapseNodes.has("2.1.1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("2.1.2")).toBeFalsy();

    expect(expandedAfterCollapseNodes.has("2.2")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("2.2.1")).toBeFalsy();
    expect(expandedAfterCollapseNodes.has("2.2.2")).toBeFalsy();

    // expandNodes with _doNotExpandToShowChildren: only expand ancestors, not the nodes themselves
    useTreeViewStore.getState().cleanUpTreeViewStore();
    useTreeViewStore.getState().updateInitialTreeViewData(tree3d2b);
    initializeNodeMaps(testStoreId, tree3d2b);

    act(() => {
      expandNodes(testStoreId, ["1", "2.1", "2.2.2"], true);
    });

    const { expanded: expandedParentsOnly } = useTreeViewStore.getState();
    expect(expandedParentsOnly.has("1")).toBeFalsy();
    expect(expandedParentsOnly.has("1.1")).toBeFalsy();
    expect(expandedParentsOnly.has("1.1.1")).toBeFalsy();
    expect(expandedParentsOnly.has("1.1.2")).toBeFalsy();
    expect(expandedParentsOnly.has("1.2")).toBeFalsy();
    expect(expandedParentsOnly.has("1.2.1")).toBeFalsy();
    expect(expandedParentsOnly.has("1.2.2")).toBeFalsy();

    expect(expandedParentsOnly.has("2")).toBeTruthy();
    expect(expandedParentsOnly.has("2.1")).toBeFalsy();
    expect(expandedParentsOnly.has("2.1.1")).toBeFalsy();
    expect(expandedParentsOnly.has("2.1.2")).toBeFalsy();

    expect(expandedParentsOnly.has("2.2")).toBeTruthy();
    expect(expandedParentsOnly.has("2.2.1")).toBeFalsy();
    expect(expandedParentsOnly.has("2.2.2")).toBeFalsy();
  });
});
