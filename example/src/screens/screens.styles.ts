import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    mainView: {
        flex: 1,
        alignSelf: "flex-start",
        backgroundColor: "white",
    },
    selectionButtonRow: {
        borderTopWidth: 0.5,
        borderColor: "lightgrey",
        paddingVertical: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 10,
    },
    selectionButtonBottom: {
        borderBottomWidth: 0.5,
        borderColor: "lightgrey"
    },
    treeViewParent: {
        flex: 1,
        minWidth: "100%"
    }
});