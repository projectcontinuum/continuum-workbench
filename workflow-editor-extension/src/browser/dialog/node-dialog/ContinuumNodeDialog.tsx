import React from 'react';
import { ReactNode } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Dialog, DialogError, DialogMode, DialogProps, Message, Widget } from '@theia/core/lib/browser';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Node } from 'reactflow';
import { IBaseNodeData, IRetryOptions } from '@continuum/core';
import ContinuumJsonFormsPropertyWidget from './ContinuumJsonFormsPropertyWidget';
import NodePropertyDataService from './NodePropertyDataService';
import RetryPolicyPanel from './RetryPolicyPanel';
import { useMUIThemeStore } from '../../store/MUIThemeStore';

@injectable()
export class ContinuumNodeDialogProps extends DialogProps {
}

export interface ContinuumNodeDialogResult {
    properties: any;
    retryOptions?: IRetryOptions;
}

interface ContinuumNodeDialogContentProps {
    activeTab: 0 | 1;
    onTabChange: (tab: 0 | 1) => void;
    propertiesHostRef: (el: HTMLDivElement | null) => void;
    nodeId?: string;
    retryOptions: IRetryOptions;
    readOnly: boolean;
    onRetryOptionsChange: (retryOptions: IRetryOptions) => void;
}

function ContinuumNodeDialogContent({
    activeTab, onTabChange, propertiesHostRef, nodeId, retryOptions, readOnly, onRetryOptionsChange
}: ContinuumNodeDialogContentProps) {
    const [theme] = useMUIThemeStore((state) => [state.theme]);
    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 480, minHeight: 400 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => onTabChange(v)}
                    sx={{ minHeight: 'auto', borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                    <Tab label="Properties" />
                    <Tab icon={<RefreshIcon fontSize="small" />} iconPosition="start" label="Retry Policy" />
                </Tabs>
                <div ref={propertiesHostRef} style={{ display: activeTab === 0 ? 'block' : 'none', flex: 1, minHeight: 0 }} />
                <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
                    <RetryPolicyPanel
                        key={nodeId}
                        retryOptions={retryOptions}
                        readOnly={readOnly}
                        onChange={onRetryOptionsChange}
                    />
                </div>
            </Box>
        </ThemeProvider>
    );
}

@injectable()
export default class ContinuumNodeDialog extends ReactDialog<ContinuumNodeDialogResult> {

    @inject(ContinuumJsonFormsPropertyWidget)
    protected readonly jsonFormsWidget: ContinuumJsonFormsPropertyWidget;

    protected selectedNode?: Node<IBaseNodeData>;
    protected readOnly = false;
    protected currentProperties: any = {};
    protected currentRetryOptions: IRetryOptions = {};
    protected hasErrors = false;
    protected activeTab: 0 | 1 = 0;
    protected propertiesAttached = false;

    constructor(
        @inject(ContinuumNodeDialogProps)
        protected override readonly props: ContinuumNodeDialogProps
    ) {
        super(props);
        this.appendAcceptButton(Dialog.OK);
    }

    @postConstruct()
    protected init(): void {
        this.jsonFormsWidget.onChange((state: any) => {
            if (state && typeof state === 'object' && 'data' in state) {
                this.currentProperties = state.data;
                this.hasErrors = !!(state.errors && state.errors.length > 0);
            } else {
                this.currentProperties = state;
            }
            this.update();
        });
        this.update();
    }

    setNode(node: Node<IBaseNodeData>, readOnly: boolean): void {
        this.selectedNode = node;
        this.readOnly = readOnly;
        this.currentProperties = node.data.properties ?? {};
        this.currentRetryOptions = node.data.retryOptions ?? {};
        this.hasErrors = false;
        this.activeTab = 0;
        this.jsonFormsWidget.updatePropertyViewContent(new NodePropertyDataService(), node);
        this.update();
    }

    protected handlePropertiesHost = (el: HTMLDivElement | null): void => {
        if (el && !this.propertiesAttached) {
            Widget.attach(this.jsonFormsWidget, el);
            this.propertiesAttached = true;
        }
    };

    protected handleTabChange = (tab: 0 | 1): void => {
        this.activeTab = tab;
        this.update();
    };

    protected handleRetryOptionsChange = (retryOptions: IRetryOptions): void => {
        this.currentRetryOptions = retryOptions;
        this.update();
    };

    protected override isValid(_value: ContinuumNodeDialogResult, _mode: DialogMode): DialogError {
        return this.hasErrors ? 'Fix validation errors before continuing' : '';
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.update();
    }

    protected render(): ReactNode {
        return (
            <ContinuumNodeDialogContent
                activeTab={this.activeTab}
                onTabChange={this.handleTabChange}
                propertiesHostRef={this.handlePropertiesHost}
                nodeId={this.selectedNode?.id}
                retryOptions={this.currentRetryOptions}
                readOnly={this.readOnly}
                onRetryOptionsChange={this.handleRetryOptionsChange}
            />
        );
    }

    get value(): ContinuumNodeDialogResult {
        return { properties: this.currentProperties, retryOptions: this.currentRetryOptions };
    }

    override dispose(): void {
        if (this.propertiesAttached) {
            Widget.detach(this.jsonFormsWidget);
            this.propertiesAttached = false;
        }
        super.dispose();
    }
}
