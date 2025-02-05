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
    selectionButtonBottomSingle: {
        borderBottomWidth: 0.5,
        borderColor: "lightgrey",
        justifyContent: "center"
    },
    treeViewParent: {
        flex: 1,
        minWidth: "100%"
    },

    // Advanced controls screen
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    dialogBox: {
        width: 300,
        padding: 20,
        backgroundColor: "white",
        borderRadius: 10,
        alignItems: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
});