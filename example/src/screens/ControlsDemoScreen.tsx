import * as React from 'react';

import {
    Button,
    Modal,
    SafeAreaView,
    View,
    Text,
    TextInput,
} from 'react-native';

import {
    TreeView,
    type TreeViewRef
} from 'react-native-tree-multi-select';

import { styles } from './screens.styles';
import {
    defaultID,
    generateTreeList
} from '../utils/sampleDataGenerator';
import debounce from "lodash/debounce";

export default function ControlsDemoScreen() {
    const sampleData = React.useRef(generateTreeList(200, 5, 6, defaultID, "1"));
    const treeViewRef = React.useRef<TreeViewRef | null>(null);
    const onSubmitFnRef = React.useRef<() => void>(() => { });

    const [dialogTitle, setDialogTitle] = React.useState("Enter Text");
    const [placeholder, setPlaceholder] = React.useState("Type here");
    const [visible, setVisible] = React.useState(false);
    const input = React.useRef("");

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetInput = React.useCallback(
        debounce((text) => {
            input.current = text;
        }, 100, { trailing: true, leading: false }),
        []
    );

    function expandNodesPressed() {
        setDialogTitle("Enter Node IDs to Expand");
        setPlaceholder("Comma Separated Node IDs");
        setVisible(true);
        onSubmitFnRef.current = expandNodes;
    }
    function expandNodes() {
        const nodeIds = input.current.split(',').map(id => id.trim());
        treeViewRef.current?.expandNodes(nodeIds);

        setVisible(false);
        onSubmitFnRef.current = () => { };
    };

    function collapseNodesPressed() {
        setDialogTitle("Enter Node IDs to Collapse");
        setPlaceholder("Comma Separated Node IDs");
        setVisible(true);
        onSubmitFnRef.current = collapseNodes;
    }
    function collapseNodes() {
        const nodeIds = input.current.split(',').map(id => id.trim());
        treeViewRef.current?.collapseNodes(nodeIds);

        setVisible(false);
        onSubmitFnRef.current = () => { };
    };

    function selectNodesPressed() {
        setDialogTitle("Enter Node IDs to Select");
        setPlaceholder("Comma Separated Node IDs");
        setVisible(true);
        onSubmitFnRef.current = selectNodes;
    }
    function selectNodes() {
        const nodeIds = input.current.split(',').map(id => id.trim());
        treeViewRef.current?.selectNodes(nodeIds);

        setVisible(false);
        onSubmitFnRef.current = () => { };
    };

    function unselectNodesPressed() {
        setDialogTitle("Enter Node IDs to Unselect");
        setPlaceholder("Comma Separated Node IDs");
        setVisible(true);
        onSubmitFnRef.current = unselectNodes;
    }
    function unselectNodes() {
        const nodeIds = input.current.split(',').map(id => id.trim());
        treeViewRef.current?.unselectNodes(nodeIds);

        setVisible(false);
        onSubmitFnRef.current = () => { };
    };

    function scrollToNodeIDPressed() {
        setDialogTitle("Enter Node ID to Scroll To");
        setPlaceholder("Enter Single Node ID");
        setVisible(true);
        onSubmitFnRef.current = scrollToNodeID;
    }
    function scrollToNodeID() {
        const nodeId = input.current.trim();
        treeViewRef.current?.scrollToNodeID({ nodeId, animated: true });

        setVisible(false);
        onSubmitFnRef.current = () => { };
    };

    function onDialogCancel() {
        setVisible(false);
        onSubmitFnRef.current = () => { };
    }

    function onDialogSubmit() {
        setVisible(false);
        onSubmitFnRef.current();
    }

    return (
        <SafeAreaView
            style={styles.mainView}>

            <Modal
                visible={visible}
                transparent
                animationType={"fade"}>
                <View style={styles.modalContainer}>
                    <View style={styles.dialogBox}>
                        <Text style={styles.title}>{dialogTitle}</Text>
                        <TextInput
                            autoCorrect={false}
                            autoFocus={true}
                            style={styles.input}
                            placeholder={placeholder}
                            onChangeText={debouncedSetInput}
                        />
                        <View style={styles.buttonContainer}>
                            <Button title="Cancel" onPress={onDialogCancel} />
                            <Button title="Submit" onPress={onDialogSubmit} />
                        </View>
                    </View>
                </View>
            </Modal>

            <View
                style={styles.selectionButtonRow}>
                <Button
                    title='Expand Nodes'
                    onPress={expandNodesPressed} />
                <Button
                    title='Collapse Nodes'
                    onPress={collapseNodesPressed} />
            </View>
            <View
                style={styles.selectionButtonRow}>
                <Button
                    title='Select Nodes'
                    onPress={selectNodesPressed} />
                <Button
                    title='Unselect Nodes'
                    onPress={unselectNodesPressed} />
            </View>

            <View
                style={[
                    styles.selectionButtonRow,
                    styles.selectionButtonBottomSingle
                ]}>
                <Button
                    title='Scroll To Node'
                    onPress={scrollToNodeIDPressed} />
            </View>

            <View
                style={styles.treeViewParent}>
                <TreeView
                    ref={treeViewRef}
                    data={sampleData.current} />
            </View>
        </SafeAreaView>
    );
}
