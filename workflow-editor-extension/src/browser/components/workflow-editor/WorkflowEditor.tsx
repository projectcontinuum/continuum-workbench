import "reactflow/dist/base.css";
import './WorkflowEditor.css';

import React, { forwardRef, useImperativeHandle } from 'react';
import { useRef, useCallback } from 'react';
import ReactFlow, { Connection, Controls, EdgeChange, Node, NodeChange, Panel, addEdge, applyEdgeChanges, applyNodeChanges, getOutgoers } from 'reactflow';
import BaseNode from '../node/BaseNode';
import BaseEdge from '../node/BaseEdge';
import { Box, Button, ButtonGroup, IconButton, Menu, MenuItem } from '@mui/material';
import { IBaseNodeData, IWorkflow } from "@continuum/core";
import { ContinuumNodeDialogResult } from "../../dialog/node-dialog/ContinuumNodeDialog";
import ScheduleWorkflowDialog from "../schedule-workflow-dialog/ScheduleWorkflowDialog";
import WorkflowService from "../../service/WorkflowService";
import LockClockIcon from '@mui/icons-material/LockClock';
import SendIcon from '@mui/icons-material/Send';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const nodeTypes = {
  BaseNode
};
const edgeTypes = {
    BaseEdge
};
const defaultEdgeOptions = {
    type: "BaseEdge"
};

export interface WorkflowEditorProps {
    workflow: IWorkflow,
    onChange: (workflow: IWorkflow)=>void,
    onContextMenu?: (event: React.MouseEvent, selectedNodeId?: string)=>void,
    onHistoryChange?: ()=>void,
    onRunSuccess?: (workflowId: string)=>void,
    openNodeDialog: (node: Node<IBaseNodeData>, readOnly: boolean) => Promise<ContinuumNodeDialogResult | undefined>
}

export interface WorkflowEditorRef {
    runWorkflow: () => void;
    openNodeSettings: () => void;
    openScheduleDialog: (initialTab?: 0 | 1) => void;
}

const WorkflowEditor = forwardRef<WorkflowEditorRef, WorkflowEditorProps>(({ workflow, onChange, onContextMenu, onHistoryChange, onRunSuccess, openNodeDialog }, ref) => {
    const reactFlowRef = useRef<HTMLDivElement | null>(null);
    const workflowService = React.useMemo(() => new WorkflowService(), []);
    const [flowEdges, setFlowEdges] = React.useState(workflow.edges);
    const [flowNodes, setFlowNodes] = React.useState(workflow.nodes);
    const [isActive, _setIsActive] = React.useState(workflow.active);
    const [scheduleMenuAnchor, setScheduleMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [scheduleDialogState, setScheduleDialogState] = React.useState<{ open: boolean; initialTab: 0 | 1 }>({ open: false, initialTab: 0 });

    React.useEffect(()=>{
        if(workflow) {
            onChange({
                ...workflow,
                nodes: flowNodes,
                edges: flowEdges,
                active: isActive
            });
        }
    },[flowNodes, flowEdges, isActive])

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        // console.log("onNodesChange");
        setFlowNodes((nodes) => applyNodeChanges(changes, nodes));
    },[setFlowNodes]);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        // console.log("onEdgesChange");
        setFlowEdges((edges) => applyEdgeChanges(changes, edges));
    },[setFlowEdges]);

    const onNodeConnect = useCallback((connection: Connection) => {
        // console.log("onNodeConnect");
        setFlowEdges((edges) => addEdge(connection, edges));
        // Record history when edge is added
        onHistoryChange?.();
    },[setFlowEdges, onHistoryChange]);

    const onNodeDragStop = useCallback(() => {
        // Record history when node drag ends
        onHistoryChange?.();
    }, [onHistoryChange]);

    const onNodesDelete = useCallback(() => {
        // Record history when nodes are deleted
        onHistoryChange?.();
    }, [onHistoryChange]);

    const onEdgesDelete = useCallback(() => {
        // Record history when edges are deleted
        onHistoryChange?.();
    }, [onHistoryChange]);

    const hasCycle = React.useCallback((connection: Connection, node: Node, visited = new Set()): boolean => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, flowNodes, flowEdges)) {
            if (outgoer.id === connection.source) return true;
            if (hasCycle(connection, outgoer, visited)) return true;
        }
        return false;
    }, [flowEdges, flowNodes]);

    const isValidConnection = React.useCallback((connection: Connection): boolean => {
        if (connection.source === connection.target) return false;
        if (flowEdges.filter((edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle).length > 0)
            return false;
        const targetNode: Node = flowNodes.find(
            (node) => node.id === connection.target
        )!;
        if (hasCycle(connection, targetNode)) return false;
        return true;
    }, [flowEdges, flowNodes, hasCycle]);

    const onRun = React.useCallback(async () => {
        console.log({ flowNodes, flowEdges });
        try {
            const response = await workflowService.activateWorkflow({
                id: workflow.id,
                name: workflow.name,
                active: true,
                edges: flowEdges,
                nodes: flowNodes,
            });
            onRunSuccess?.(response.workflowId);
        } catch (error) {
            console.error(error);
        }
    }, [flowEdges, flowNodes, onRunSuccess]);

    const onOpenScheduleMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
        setScheduleMenuAnchor(event.currentTarget);
    }, []);

    const onCloseScheduleMenu = React.useCallback(() => {
        setScheduleMenuAnchor(null);
    }, []);

    const openScheduleDialog = React.useCallback((initialTab: 0 | 1 = 0) => {
        setScheduleMenuAnchor(null);
        setScheduleDialogState({ open: true, initialTab });
    }, []);

    const onScheduleDialogClose = React.useCallback(() => {
        setScheduleDialogState(s => ({ ...s, open: false }));
    }, []);

    const applyNodeDialogResult = React.useCallback((node: Node<IBaseNodeData>, result: ContinuumNodeDialogResult) => {
        node.data.properties = result.properties;
        node.data.retryOptions = result.retryOptions;
        setFlowNodes(flowNodes);
    }, [flowNodes, setFlowNodes]);

    const openNodeSettings = React.useCallback(async () => {
        const selected = flowNodes.find(n => n.selected);
        if (selected) {
            const result = await openNodeDialog(selected, isActive);
            if (result) {
                applyNodeDialogResult(selected, result);
            }
        }
    }, [flowNodes, isActive, openNodeDialog, applyNodeDialogResult]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        runWorkflow: onRun,
        openNodeSettings,
        openScheduleDialog
    }), [onRun, openNodeSettings, openScheduleDialog]);

    const onNodeDoubleClick = React.useCallback(async (event: React.MouseEvent, clickedNode: Node<IBaseNodeData>) => {
        const result = await openNodeDialog(clickedNode, isActive);
        if (result) {
            applyNodeDialogResult(clickedNode, result);
        }
    }, [openNodeDialog, isActive, applyNodeDialogResult]);

    const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node<IBaseNodeData>) => {
        // Select the node that was right-clicked
        setFlowNodes((nodes) => nodes.map((n) => ({
            ...n,
            selected: n.id === node.id
        })));
        // Then trigger the context menu with the selected node id
        onContextMenu?.(event, node.id);
    }, [setFlowNodes, onContextMenu]);

    const onPaneContextMenu = React.useCallback((event: React.MouseEvent | MouseEvent) => {
        // Right-click on empty canvas - no node selected
        onContextMenu?.(event as React.MouseEvent, undefined);
    }, [onContextMenu]);

    return (
        <Box
            sx={{
                display: "flex",
                flexGrow: 1,
                bgcolor: "transparent",
                p: 0,
                position: "absolute",
                m: 1,
                bottom: 0,
                left: 0,
                right: 0,
                top: 0
            }}>
            <ReactFlow
                ref={reactFlowRef}
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={!isActive ? onNodesChange : undefined}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onNodeDragStop={onNodeDragStop}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onEdgesChange={!isActive ? onEdgesChange : undefined}
                onConnect={!isActive ? onNodeConnect: undefined}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                className="workflow-editor"
                fitView>
                <Controls />
                <Panel position="bottom-center">
                    <ButtonGroup variant="contained">
                        <Button onClick={onRun} endIcon={<SendIcon />}>Run</Button>
                        <Button
                            size="small"
                            aria-label="schedule workflow options"
                            aria-haspopup="menu"
                            onClick={onOpenScheduleMenu}
                            sx={{ px: 0.5 }}>
                            <ArrowDropDownIcon />
                        </Button>
                    </ButtonGroup>
                    <Menu
                        anchorEl={scheduleMenuAnchor}
                        open={Boolean(scheduleMenuAnchor)}
                        onClose={onCloseScheduleMenu}
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                        <MenuItem onClick={() => openScheduleDialog(0)}>Schedule Workflow...</MenuItem>
                        <MenuItem onClick={() => openScheduleDialog(1)}>Manage Schedules...</MenuItem>
                    </Menu>
                </Panel>
                {isActive && <Panel position="top-right">
                    <IconButton aria-label="delete">
                        <LockClockIcon />
                    </IconButton>
                </Panel>}
            </ReactFlow>
            {scheduleDialogState.open && <ScheduleWorkflowDialog
                open={scheduleDialogState.open}
                workflowId={workflow.id}
                workflowName={workflow.name}
                nodes={flowNodes}
                edges={flowEdges}
                initialTab={scheduleDialogState.initialTab}
                onClose={onScheduleDialogClose}/>}
        </Box>
    );
});

export default WorkflowEditor;
