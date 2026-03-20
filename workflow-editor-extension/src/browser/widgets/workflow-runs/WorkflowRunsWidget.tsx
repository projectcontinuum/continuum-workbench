import * as React from 'react';
import { BaseWidget, Message, BoxLayout, ReactWidget } from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Command, URI } from '@theia/core';
import { WorkflowRunsTreeWidget } from '../../tree/workflow-runs/WorkflowRunsTreeWidget';
import { WorkflowRunsTree, WorkflowRunsRootNode } from '../../tree/workflow-runs/WorkflowRunsTree';
import { OpenerService } from '@theia/core/lib/browser';
import {
    IconButton, Tooltip, Box, Select, MenuItem, FormControl,
    ToggleButton, ToggleButtonGroup, TextField, SelectChangeEvent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ThemeProvider, experimental_extendTheme, Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material';
import { useMUIThemeStore } from '../../store/MUIThemeStore';

type TimePreset = '1h' | '24h' | '7d' | '30d' | 'custom';

interface ToolbarState {
    preset: TimePreset;
    fromDate: Date;
    toDate: Date;
    pageSize: number;
}

function getPresetDates(preset: TimePreset): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date();
    switch (preset) {
        case '1h':
            from.setHours(from.getHours() - 1);
            break;
        case '24h':
            from.setHours(from.getHours() - 24);
            break;
        case '7d':
            from.setDate(from.getDate() - 7);
            break;
        case '30d':
            from.setDate(from.getDate() - 30);
            break;
        default:
            from.setHours(from.getHours() - 24);
    }
    return { from, to: now };
}

/**
 * Build RSQL time filter with UTC timestamps.
 * Date.toISOString() automatically converts local timezone to UTC (Z suffix).
 * The datetime-local inputs display in the user's local timezone,
 * but the API receives UTC values like: updatedAt>=2026-03-20T02:30:00.000Z
 */
function buildTimeFilter(from: Date, to: Date): string {
    return `updatedAt>=${from.toISOString()};updatedAt<=${to.toISOString()}`;
}

/** Convert Date to datetime-local input value (YYYY-MM-DDTHH:MM) */
function toDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Shared mutable ref so the toolbar can expose its current filter state
 * to the parent widget for rolling-window recalculation on refresh.
 */
interface ToolbarRef {
    getCurrentFilter: () => string;
    getPageSize: () => number;
}

function WorkflowRunsToolbarContent({
    onTimeFilterChange,
    onPageSizeChange,
    onRefresh,
    toolbarRef
}: {
    onTimeFilterChange: (filter: string) => void;
    onPageSizeChange: (size: number) => void;
    onRefresh: () => void;
    toolbarRef: ToolbarRef;
}) {
    const [theme] = useMUIThemeStore((state) => [state.theme]);
    const cssTheme = experimental_extendTheme(theme);

    const [state, setState] = React.useState<ToolbarState>(() => {
        const { from, to } = getPresetDates('24h');
        return { preset: '24h', fromDate: from, toDate: to, pageSize: 50 };
    });

    // Expose a method that recalculates the rolling window for preset modes.
    // For presets, "now" is recalculated each time this is called.
    // For custom mode, the fixed dates are returned as-is.
    toolbarRef.getCurrentFilter = () => {
        if (state.preset !== 'custom') {
            const { from, to } = getPresetDates(state.preset);
            return buildTimeFilter(from, to);
        }
        return buildTimeFilter(state.fromDate, state.toDate);
    };
    toolbarRef.getPageSize = () => state.pageSize;

    // Emit initial filter on mount
    React.useEffect(() => {
        onTimeFilterChange(toolbarRef.getCurrentFilter());
    }, []);

    const handlePresetChange = (_: React.MouseEvent<HTMLElement>, newPreset: TimePreset | null) => {
        if (!newPreset) return;
        if (newPreset === 'custom') {
            // Snapshot current rolling window into fixed custom dates
            const { from, to } = getPresetDates(state.preset === 'custom' ? '24h' : state.preset);
            setState(prev => ({ ...prev, preset: 'custom', fromDate: from, toDate: to }));
            return;
        }
        setState(prev => ({ ...prev, preset: newPreset }));
        // Recalculate rolling window from "now" and emit
        const { from, to } = getPresetDates(newPreset);
        onTimeFilterChange(buildTimeFilter(from, to));
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (isNaN(date.getTime())) return;
        setState(prev => {
            onTimeFilterChange(buildTimeFilter(date, prev.toDate));
            return { ...prev, fromDate: date, preset: 'custom' };
        });
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (isNaN(date.getTime())) return;
        setState(prev => {
            onTimeFilterChange(buildTimeFilter(prev.fromDate, date));
            return { ...prev, toDate: date, preset: 'custom' };
        });
    };

    const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
        const size = event.target.value as number;
        setState(prev => ({ ...prev, pageSize: size }));
        onPageSizeChange(size);
    };

    return (
        <CssVarsProvider theme={cssTheme}>
            <ThemeProvider theme={theme}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--theia-sideBarSectionHeader-border)'
                }}>
                    {/* Preset buttons row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ToggleButtonGroup
                            value={state.preset}
                            exclusive
                            onChange={handlePresetChange}
                            size="small"
                            sx={{ flexGrow: 1 }}
                        >
                            <ToggleButton value="1h" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>1h</ToggleButton>
                            <ToggleButton value="24h" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>24h</ToggleButton>
                            <ToggleButton value="7d" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>7d</ToggleButton>
                            <ToggleButton value="30d" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>30d</ToggleButton>
                            <ToggleButton value="custom" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Custom</ToggleButton>
                        </ToggleButtonGroup>

                        <FormControl size="small" sx={{ minWidth: 60 }}>
                            <Select
                                value={state.pageSize}
                                onChange={handlePageSizeChange}
                                sx={{ fontSize: '11px', height: '28px' }}
                            >
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={20}>20</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                                <MenuItem value={100}>100</MenuItem>
                            </Select>
                        </FormControl>

                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={onRefresh} sx={{ padding: '4px' }}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Custom date pickers row - only shown when custom is selected */}
                    {state.preset === 'custom' && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <TextField
                                label="From"
                                type="datetime-local"
                                size="small"
                                value={toDateTimeLocal(state.fromDate)}
                                onChange={handleFromChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1, '& input': { fontSize: '11px', padding: '4px 8px' }, '& label': { fontSize: '11px' } }}
                            />
                            <TextField
                                label="To"
                                type="datetime-local"
                                size="small"
                                value={toDateTimeLocal(state.toDate)}
                                onChange={handleToChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 1, '& input': { fontSize: '11px', padding: '4px 8px' }, '& label': { fontSize: '11px' } }}
                            />
                        </Box>
                    )}
                </Box>
            </ThemeProvider>
        </CssVarsProvider>
    );
}

class WorkflowRunsToolbar extends ReactWidget {
    protected onTimeFilterChange: (filter: string) => void = () => {};
    protected onPageSizeChange: (size: number) => void = () => {};
    protected onRefresh: () => void = () => {};

    /** Ref shared with the React component to access current filter state */
    readonly toolbarRef: ToolbarRef = {
        getCurrentFilter: () => buildTimeFilter(...Object.values(getPresetDates('24h')) as [Date, Date]),
        getPageSize: () => 50
    };

    constructor() {
        super();
        this.addClass('workflow-runs-toolbar');
        this.node.style.minHeight = '40px';
        this.node.style.flexShrink = '0';
    }

    setHandlers(
        onTimeFilterChange: (filter: string) => void,
        onPageSizeChange: (size: number) => void,
        onRefresh: () => void
    ): void {
        this.onTimeFilterChange = onTimeFilterChange;
        this.onPageSizeChange = onPageSizeChange;
        this.onRefresh = onRefresh;
        this.update();
    }

    protected render(): React.ReactNode {
        return (
            <WorkflowRunsToolbarContent
                onTimeFilterChange={this.onTimeFilterChange}
                onPageSizeChange={this.onPageSizeChange}
                onRefresh={this.onRefresh}
                toolbarRef={this.toolbarRef}
            />
        );
    }
}

@injectable()
export default class WorkflowRunsWidget extends BaseWidget {
    static readonly ID = 'continuum-workflow-runs:widget';
    static readonly LABEL = 'Workflow Runs';
    static readonly COMMAND: Command = { id: 'workflow-runs-widget:command' };

    @inject(WorkflowRunsTreeWidget)
    protected readonly treeWidget!: WorkflowRunsTreeWidget;

    @inject(WorkflowRunsTree)
    protected readonly tree!: WorkflowRunsTree;

    @inject(OpenerService)
    protected readonly openerService!: OpenerService;

    protected toolbar!: WorkflowRunsToolbar;

    @postConstruct()
    protected init(): void {
        this.id = WorkflowRunsWidget.ID;
        this.title.label = WorkflowRunsWidget.LABEL;
        this.title.caption = WorkflowRunsWidget.LABEL;
        this.title.closable = false;
        this.title.iconClass = 'continuum continuum-widget codicon codicon-run-all';

        this.node.style.display = 'flex';
        this.node.style.flexDirection = 'column';
        this.node.style.height = '100%';

        this.toolbar = new WorkflowRunsToolbar();
        this.toolbar.setHandlers(
            (filter) => this.handleTimeFilterChange(filter),
            (size) => this.handlePageSizeChange(size),
            () => this.refresh()
        );

        const layout = new BoxLayout({ direction: 'top-to-bottom' });
        layout.addWidget(this.toolbar);
        layout.addWidget(this.treeWidget);
        BoxLayout.setStretch(this.toolbar, 0);
        BoxLayout.setStretch(this.treeWidget, 1);
        this.layout = layout;

        this.treeWidget.node.style.flex = '1';
        this.treeWidget.node.style.height = '100%';
        this.treeWidget.node.style.overflow = 'auto';

        // Handle "Load more" clicks
        this.treeWidget.onLoadMoreClick(async (loadMoreNode) => {
            await this.tree.loadMore(loadMoreNode);
        });

        // Handle double-click on run nodes — open execution viewer
        this.treeWidget.onRunDoubleClick(node => {
            const uri = new URI(`continuum-execution-watch://${node.runData.workflowId}`);
            this.openerService.getOpener(uri).then(opener => {
                opener.open(uri, { execution: node.runData });
            });
        });

        this.update();
    }

    protected handleTimeFilterChange(filter: string): void {
        this.tree.timeFilter = filter;
        this.refresh();
    }

    protected handlePageSizeChange(size: number): void {
        this.tree.pageSize = size;
        this.refresh();
    }

    /**
     * Refresh the tree. For preset time ranges (1h/24h/7d/30d), the window
     * is recalculated relative to "now" — acting as a rolling time window.
     * For custom mode, the fixed user-selected dates are used as-is.
     *
     * Setting model.root triggers an implicit refresh via Theia's TreeModel,
     * so we do NOT call model.refresh() separately to avoid double API calls.
     */
    protected refresh(): void {
        this.tree.timeFilter = this.toolbar.toolbarRef.getCurrentFilter();
        this.treeWidget.model.root = WorkflowRunsRootNode.create();
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.treeWidget.activate();
    }

    protected override async onAfterAttach(msg: Message): Promise<void> {
        super.onAfterAttach(msg);
        // Tree will be populated once the toolbar emits the initial time filter
        this.treeWidget.model.root = WorkflowRunsRootNode.create();
        this.toolbar.update();
    }
}
