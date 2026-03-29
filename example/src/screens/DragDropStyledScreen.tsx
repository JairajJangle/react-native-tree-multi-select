import {
    useState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    createContext,
    useContext,
} from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Button,
    Animated,
    Easing,
    TouchableOpacity,
} from "react-native";

import {
    TreeView,
    CheckboxView,
    type TreeViewRef,
    type TreeNode,
    type DragEndEvent,
    type DropIndicatorComponentProps,
    type DragOverlayComponentProps,
    type NodeRowProps,
} from "react-native-tree-multi-select";

import { styles as screenStyles } from "./screens.styles";

// Rainbow palette for the color-cycling effect
const RAINBOW = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
const RAINBOW_BG = [
    "rgba(168, 85, 247, 0.12)",
    "rgba(236, 72, 153, 0.12)",
    "rgba(245, 158, 11, 0.12)",
    "rgba(16, 185, 129, 0.12)",
    "rgba(59, 130, 246, 0.12)",
];

const initialData: TreeNode[] = [
    {
        id: "1",
        name: "Design System",
        children: [
            {
                id: "1.1",
                name: "Colors",
                children: [
                    { id: "1.1.1", name: "Primary" },
                    { id: "1.1.2", name: "Secondary" },
                    { id: "1.1.3", name: "Neutral" },
                ],
            },
            {
                id: "1.2",
                name: "Typography",
                children: [
                    { id: "1.2.1", name: "Headings" },
                    { id: "1.2.2", name: "Body Text" },
                ],
            },
            { id: "1.3", name: "Spacing" },
        ],
    },
    {
        id: "2",
        name: "Components",
        children: [
            { id: "2.1", name: "Button" },
            { id: "2.2", name: "Card" },
            { id: "2.3", name: "Modal" },
            { id: "2.4", name: "Tooltip" },
        ],
    },
    {
        id: "3",
        name: "Patterns",
        children: [
            { id: "3.1", name: "Forms" },
            { id: "3.2", name: "Navigation" },
            { id: "3.3", name: "Data Display" },
        ],
    },
    { id: "4", name: "Utilities" },
];

// Load the same FontAwesome icon the library uses for expand/collapse
let FontAwesomeIcon: any = null;
try {
    FontAwesomeIcon = require("@expo/vector-icons/FontAwesome").default;
} catch (_e) {
    try {
        FontAwesomeIcon = require("react-native-vector-icons/FontAwesome").default;
    } catch (_e2) {
        // fallback handled in render
    }
}

// ---------------------------------------------------------------------------
// Dropped-node context
// ---------------------------------------------------------------------------
const DroppedNodeContext = createContext<string | null>(null);

// ---------------------------------------------------------------------------
// Native-driven rainbow animations (shared by drop indicator & blink)
// ---------------------------------------------------------------------------

function useNativeRainbow() {
    const [cycle] = useState(() => new Animated.Value(0));
    const [slideIn] = useState(() => new Animated.Value(0));

    useEffect(() => {
        cycle.setValue(0);
        slideIn.setValue(0);

        const cycleAnim = Animated.loop(
            Animated.timing(cycle, {
                toValue: RAINBOW.length,
                duration: RAINBOW.length * 500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        const slideAnim = Animated.timing(slideIn, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });

        cycleAnim.start();
        slideAnim.start();

        return () => {
            cycleAnim.stop();
            slideAnim.stop();
        };
    }, [cycle, slideIn]);

    const colorOpacities = useMemo(() => RAINBOW.map((_, i) => {
        const n = RAINBOW.length;
        const inputRange: number[] = [];
        const outputRange: number[] = [];
        for (let t = 0; t <= n; t++) {
            inputRange.push(t);
            const dist = Math.abs(t - i);
            const wrapDist = Math.min(dist, n - dist);
            outputRange.push(Math.max(0, 1 - wrapDist));
        }
        return cycle.interpolate({ inputRange, outputRange });
    }), [cycle]);

    const diamondScale = useMemo(() => cycle.interpolate({
        inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
        outputRange: [0.9, 1.2, 0.9, 1.2, 0.9, 1.2, 0.9, 1.2, 0.9, 1.2, 0.9],
    }), [cycle]);

    return { colorOpacities, diamondScale, slideIn };
}

// ---------------------------------------------------------------------------
// Custom animated drop indicator (fully native-driven)
// ---------------------------------------------------------------------------

function FancyDropIndicator({ position, level, indentationMultiplier }: DropIndicatorComponentProps) {
    const { colorOpacities, diamondScale, slideIn } = useNativeRainbow();

    const leftOffset = level * indentationMultiplier;

    if (position === "inside") {
        return (
            <View
                pointerEvents="none"
                style={[indicatorStyles.insideContainer, { left: leftOffset }]}
            >
                {RAINBOW_BG.map((color, i) => (
                    <Animated.View
                        key={color}
                        style={[
                            StyleSheet.absoluteFill,
                            indicatorStyles.insideBgLayer,
                            { backgroundColor: color, opacity: colorOpacities[i] },
                        ]}
                    />
                ))}
                {RAINBOW.map((color, i) => (
                    <Animated.View
                        key={`b-${color}`}
                        style={[
                            StyleSheet.absoluteFill,
                            indicatorStyles.insideBorderLayer,
                            { borderColor: color, opacity: colorOpacities[i] },
                        ]}
                    />
                ))}
            </View>
        );
    }

    // Diamond is 12px wide; ensure its left half (6px) isn't clipped
    const safeLeft = Math.max(leftOffset, 6);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                indicatorStyles.lineContainer,
                { left: safeLeft, opacity: slideIn },
                position === "above"
                    ? indicatorStyles.lineTop
                    : indicatorStyles.lineBottom,
            ]}
        >
            <View style={indicatorStyles.diamondWrapper}>
                {RAINBOW.map((color, i) => (
                    <Animated.View
                        key={color}
                        style={[
                            indicatorStyles.diamondLayer,
                            {
                                backgroundColor: color,
                                opacity: colorOpacities[i],
                                transform: [{ rotate: "45deg" }, { scale: diamondScale }],
                            },
                        ]}
                    />
                ))}
            </View>
            <View style={indicatorStyles.lineWrapper}>
                {RAINBOW.map((color, i) => (
                    <Animated.View
                        key={color}
                        style={[
                            indicatorStyles.lineLayer,
                            {
                                backgroundColor: color,
                                opacity: colorOpacities[i],
                                transform: [{ scaleX: slideIn }],
                            },
                        ]}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

const indicatorStyles = StyleSheet.create({
    insideContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        zIndex: 10,
        borderRadius: 8,
        overflow: "hidden",
    },
    insideBgLayer: { borderRadius: 8 },
    insideBorderLayer: { borderWidth: 2.5, borderRadius: 8 },
    lineContainer: {
        position: "absolute",
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        height: 3,
        zIndex: 10,
        overflow: "visible",
    },
    lineTop: { top: 0 },
    lineBottom: { bottom: 0 },
    diamondWrapper: { width: 12, height: 12, marginLeft: -6 },
    diamondLayer: { position: "absolute", width: 12, height: 12, borderRadius: 2 },
    lineWrapper: { flex: 1, height: 3, marginLeft: 4 },
    lineLayer: { position: "absolute", left: 0, right: 0, height: 3, borderRadius: 1.5 },
});

// ---------------------------------------------------------------------------
// Custom node row: identical to the library default, plus rainbow blink
// ---------------------------------------------------------------------------
// Uses the library's own exported CheckboxView and the same FontAwesome icon,
// so visually it's indistinguishable from the built-in row.

function BlinkableNodeRow({ node, level, checkedValue, isExpanded, onCheck, onExpand }: NodeRowProps) {
    const droppedNodeId = useContext(DroppedNodeContext);
    const justDropped = droppedNodeId === node.id;

    // Rainbow blink: cycle through colors behind the row then fade out
    const [blinkCycle] = useState(() => new Animated.Value(0));
    const [blinkIntensity] = useState(() => new Animated.Value(0));
    const hasBlinkRef = useRef(false);

    useEffect(() => {
        if (!justDropped) {
            hasBlinkRef.current = false;
            return;
        }
        if (hasBlinkRef.current) return;
        hasBlinkRef.current = true;

        blinkCycle.setValue(0);
        blinkIntensity.setValue(0);

        // Spin through rainbow colors 2x while pulsing intensity
        const colorSpin = Animated.timing(blinkCycle, {
            toValue: RAINBOW.length * 2,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
        });
        const intensityPulse = Animated.sequence([
            Animated.timing(blinkIntensity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(blinkIntensity, { toValue: 0.3, duration: 100, useNativeDriver: true }),
            Animated.timing(blinkIntensity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(blinkIntensity, { toValue: 0.3, duration: 100, useNativeDriver: true }),
            Animated.timing(blinkIntensity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(blinkIntensity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]);

        const anim = Animated.parallel([colorSpin, intensityPulse]);
        anim.start();

        return () => anim.stop();
    }, [justDropped, blinkCycle, blinkIntensity]);

    // Per-color blink opacities (reuses same triangular math as drop indicator)
    const blinkOpacities = useMemo(() => {
        const n = RAINBOW.length;
        return RAINBOW.map((_, i) => {
            const inputRange: number[] = [];
            const outputRange: number[] = [];
            // 2 full cycles: 0..N and N..2N
            for (let t = 0; t <= n * 2; t++) {
                inputRange.push(t);
                const tMod = t % n;
                const dist = Math.abs(tMod - i);
                const wrapDist = Math.min(dist, n - dist);
                outputRange.push(Math.max(0, 1 - wrapDist));
            }
            const colorPhase = blinkCycle.interpolate({ inputRange, outputRange });
            // Multiply by intensity using chained interpolation output as a gate
            return Animated.multiply(colorPhase, blinkIntensity);
        });
    }, [blinkCycle, blinkIntensity]);

    return (
        <View style={rowStyles.row}>
            {/* Rainbow blink background layers */}
            {justDropped && RAINBOW.map((color, i) => (
                <Animated.View
                    key={color}
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: color, opacity: blinkOpacities[i] },
                    ]}
                />
            ))}

            {/* Default row content: identical to library built-in (15 = defaultIndentationMultiplier) */}
            <View style={[rowStyles.content, { paddingStart: level * 15 }]}>
                <CheckboxView
                    text={node.name}
                    onValueChange={onCheck}
                    value={checkedValue}
                />

                {node.children?.length ? (
                    <TouchableOpacity
                        style={rowStyles.expandArrow}
                        onPress={onExpand}
                    >
                        {FontAwesomeIcon ? (
                            <FontAwesomeIcon
                                name={isExpanded ? "caret-down" : "caret-right"}
                                size={20}
                                color="black"
                            />
                        ) : (
                            <Text>{isExpanded ? "\u25BC" : "\u25B6"}</Text>
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        position: "relative",
        overflow: "hidden",
    },
    content: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: "100%",
    },
    expandArrow: {
        flex: 1,
    },
});

// ---------------------------------------------------------------------------
// Custom drag overlay (clean, no emojis)
// ---------------------------------------------------------------------------

function FancyDragOverlay({ node, level }: DragOverlayComponentProps) {
    const [mountAnim] = useState(() => new Animated.Value(0));

    useEffect(() => {
        mountAnim.setValue(0);
        const anim = Animated.spring(mountAnim, {
            toValue: 1,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
    }, [mountAnim]);

    const scale = mountAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.92, 1],
    });

    return (
        <Animated.View
            style={[
                overlayStyles.container,
                { transform: [{ scale }] },
            ]}
        >
            {/* Same layout as the built-in row: checkbox + name + expand icon */}
            <View style={[overlayStyles.row, { paddingStart: level * 15 }]}>
                <CheckboxView
                    text={node.name}
                    onValueChange={() => {}}
                    value={false}
                />

                {node.children?.length ? (
                    <View style={overlayStyles.expandArrow}>
                        {FontAwesomeIcon ? (
                            <FontAwesomeIcon
                                name="caret-right"
                                size={20}
                                color="black"
                            />
                        ) : (
                            <Text>{"\u25B6"}</Text>
                        )}
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
}

const overlayStyles = StyleSheet.create({
    container: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderWidth: 1.5,
        borderColor: "rgba(168, 85, 247, 0.3)",
        borderRadius: 8,
        shadowColor: "#a855f7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 12,
    },
    row: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        minWidth: "100%",
    },
    expandArrow: {
        flex: 1,
    },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DragDropStyledScreen() {
    const [data, setData] = useState<TreeNode[]>(initialData);
    const treeViewRef = useRef<TreeViewRef | null>(null);
    const [lastDrop, setLastDrop] = useState("");
    const [droppedNodeId, setDroppedNodeId] = useState<string | null>(null);
    const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setData(event.newTreeData);
        setLastDrop(
            `"${event.draggedNodeId}" \u2192 ${event.position} "${event.targetNodeId}"`
        );
        setDroppedNodeId(event.draggedNodeId);
        if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = setTimeout(() => setDroppedNodeId(null), 1500);
    }, []);

    useEffect(() => {
        return () => {
            if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
        };
    }, []);

    return (
        <DroppedNodeContext.Provider value={droppedNodeId}>
            <SafeAreaView style={screenStyles.mainView}>
                <Text style={localStyles.dropInfo}>
                    {lastDrop || "Custom components \u2022 Animated indicators & overlay"}
                </Text>

                <View style={screenStyles.selectionButtonRow}>
                    <Button title="Expand All" onPress={() => treeViewRef.current?.expandAll()} />
                    <Button title="Collapse All" onPress={() => treeViewRef.current?.collapseAll()} />
                </View>
                <View style={[screenStyles.selectionButtonRow, screenStyles.selectionButtonBottom]}>
                    <Button title="Reset" onPress={() => { setData(initialData); setLastDrop(""); setDroppedNodeId(null); }} />
                </View>

                <View style={screenStyles.treeViewParent}>
                    <TreeView
                        ref={treeViewRef}
                        data={data}
                        onCheck={() => {}}
                        onExpand={() => {}}
                        dragEnabled={true}
                        onDragEnd={handleDragEnd}
                        preExpandedIds={["1", "2", "3"]}
                        CustomNodeRowComponent={BlinkableNodeRow}
                        dragDropCustomizations={{
                            draggedNodeOpacity: 0.15,
                            CustomDropIndicatorComponent: FancyDropIndicator,
                            CustomDragOverlayComponent: FancyDragOverlay,
                        }}
                    />
                </View>
            </SafeAreaView>
        </DroppedNodeContext.Provider>
    );
}

const localStyles = StyleSheet.create({
    dropInfo: {
        padding: 10,
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
    },
});
