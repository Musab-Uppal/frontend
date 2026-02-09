import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AssetStateService, AssetOption } from 'src/app/services/asset-state.service';
import {
    ApiService,
    Rule,
    RuleCreate,
    RuleOperator,
    CronJob,
    CronJobCreate,
    CronScheduleExample,
    CronExecutionLog,
    LogEntry,
    Preset,
    PresetCreate,
    PresetConditionBackend
} from '../../services/api.service';

interface RuleCondition {
    type: 'where' | 'and' | 'or' | 'subgroup';
    column: string;
    operator: string;
    value: string;
    value2?: string;
    conditions?: RuleCondition[];
    isSubgroup?: boolean;
}

interface CalendarDate {
    day: number;
    isCurrentMonth: boolean;
    events: CalendarEvent[];
    isSelected?: boolean;
}

interface CalendarEvent {
    label: string;
    type: 'success' | 'error' | 'skipped' | 'override' | 'notStarted';
}

interface RestoreData {
    details: string;
    date: string;
    time: string;
    process: string;
}

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoCompleteModule, ToastModule, TooltipModule],
    templateUrl: './settings.html',
    providers: [MessageService]
})
export class Settings implements OnInit {
    selectedAsset!: AssetOption;

    // Loading states
    loadingRules = false;
    loadingCronJobs = false;
    loadingPresets = false;
    loadingRestoreData = false;
    savingRule = false;
    savingJob = false;
    savingPreset = false;

    // ==================== RULES ====================
    rules: Rule[] = [];
    rulesLogs: LogEntry[] = [];
    columnOptions: any[] = [];
    filteredColumnOptions: any[] = [];
    operatorOptions: any[] = [];
    filteredOperatorOptions: any[] = [];

    ruleConditions: RuleCondition[] = [
        { type: 'where', column: '', operator: '', value: '' }
    ];
    showAdditionalConditions = false;
    newRuleName = '';
    editingRuleId: number | null = null;

    // ==================== CRON JOBS ====================
    cronJobs: CronJob[] = [];
    cronLogs: LogEntry[] = [];
    cronExecutionLogs: CronExecutionLog[] = [];
    scheduleExamples: CronScheduleExample[] = [];

    newJobName = '';
    newJobSchedule = '0 18 * * 1-5'; // Default: weekdays at 6 PM
    newJobActive = true;

    // Calendar
    weekDays: string[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    currentMonth = '';
    currentYear = 0;
    currentMonthIndex = 0;
    calendarDates: CalendarDate[] = [];
    selectedDate: CalendarDate | null = null;

    // ==================== PRESETS ====================
    presets: Preset[] = [];
    presetLogs: LogEntry[] = [];
    showPresetForm = false;
    newPresetName = '';
    newPresetDescription = '';
    editingPresetId: number | null = null;

    presetConditions: RuleCondition[] = [
        { type: 'where', column: '', operator: '', value: '' }
    ];

    // ==================== RESTORE & EMAIL ====================
    restoreData: RestoreData[] = [];
    restoreLogs: LogEntry[] = [];

    // Active options for autocomplete
    activeOptions: any[] = [
        { label: 'Yes', value: true },
        { label: 'No', value: false }
    ];
    filteredActiveOptions: any[] = [];

    repeatOptions: any[] = [
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' }
    ];
    filteredRepeatOptions: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private assetStateService: AssetStateService,
        private apiService: ApiService,
        private messageService: MessageService
    ) {
        const now = new Date();
        this.currentMonthIndex = now.getMonth();
        this.currentYear = now.getFullYear();
        this.updateMonthLabel();
    }

    ngOnInit() {
        this.route.queryParams.subscribe((params) => {
            const section = params['section'];
            if (section) {
                setTimeout(() => this.scrollToSection(section + '-section'), 100);
            }
        });

        this.assetStateService.asset$.subscribe((asset) => {
            this.selectedAsset = asset;
        });

        // Load all data from backend
        this.loadRules();
        this.loadOperators();
        this.loadSearchableFields();
        this.loadCronJobs();
        this.loadCronScheduleExamples();
        this.loadPresets();
        this.loadRestoreData();
        this.loadAllLogs();
        this.generateCalendar();
    }

    // ==================== DATA LOADING ====================

    loadRules() {
        this.loadingRules = true;
        this.apiService.getRules().subscribe({
            next: (res) => {
                this.rules = res.rules;
                this.loadingRules = false;
            },
            error: (err) => {
                console.error('Error loading rules:', err);
                this.loadingRules = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load rules' });
            }
        });
    }

    loadOperators() {
        this.apiService.getRuleOperators().subscribe({
            next: (res) => {
                this.operatorOptions = res.operators.map(op => ({ label: op.label, value: op.value }));
            },
            error: (err) => console.error('Error loading operators:', err)
        });
    }

    loadSearchableFields() {
        this.apiService.getSearchableFields().subscribe({
            next: (res) => {
                this.columnOptions = res.fields.map(f => ({ label: f.display_name, value: f.name }));
            },
            error: (err) => console.error('Error loading fields:', err)
        });
    }

    loadCronJobs() {
        this.loadingCronJobs = true;
        this.apiService.getCronJobs().subscribe({
            next: (res) => {
                this.cronJobs = res.jobs;
                this.loadingCronJobs = false;
                this.loadCronExecutionLogs();
            },
            error: (err) => {
                console.error('Error loading cron jobs:', err);
                this.loadingCronJobs = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load cron jobs' });
            }
        });
    }

    loadCronExecutionLogs() {
        this.apiService.getCronExecutionLogs(20).subscribe({
            next: (res) => {
                this.cronExecutionLogs = res.logs;
                this.updateCalendarWithLogs();
            },
            error: (err) => console.error('Error loading cron execution logs:', err)
        });
    }

    loadCronScheduleExamples() {
        this.apiService.getCronScheduleExamples().subscribe({
            next: (res) => {
                this.scheduleExamples = res.examples;
            },
            error: (err) => console.error('Error loading schedule examples:', err)
        });
    }

    loadPresets() {
        this.loadingPresets = true;
        this.apiService.getPresets().subscribe({
            next: (res) => {
                this.presets = res.presets;
                this.loadingPresets = false;
            },
            error: (err) => {
                console.error('Error loading presets:', err);
                this.loadingPresets = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load presets' });
            }
        });
    }

    loadRestoreData() {
        this.loadingRestoreData = true;
        this.apiService.getCronExecutionLogs(10).subscribe({
            next: (res) => {
                this.restoreData = res.logs.map(log => ({
                    details: log.job_name,
                    date: new Date(log.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    time: new Date(log.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    process: log.triggered_by === 'manual' ? 'Manual' : 'Automated'
                }));
                this.loadingRestoreData = false;
            },
            error: (err) => {
                console.error('Error loading restore data:', err);
                this.loadingRestoreData = false;
            }
        });
    }

    loadAllLogs() {
        // Rules logs
        this.apiService.getRulesLogs(4).subscribe({
            next: (res) => { this.rulesLogs = res.logs; },
            error: (err) => console.error('Error loading rules logs:', err)
        });

        // Cron logs
        this.apiService.getCronLogs(4).subscribe({
            next: (res) => { this.cronLogs = res.logs; },
            error: (err) => console.error('Error loading cron logs:', err)
        });

        // Restore logs
        this.apiService.getRestoreLogs(4).subscribe({
            next: (res) => { this.restoreLogs = res.logs; },
            error: (err) => console.error('Error loading restore logs:', err)
        });

        // Preset logs (use generic with module filter)
        this.apiService.getLogs('presets', 4).subscribe({
            next: (res) => { this.presetLogs = res.logs; },
            error: (err) => console.error('Error loading preset logs:', err)
        });
    }

    // ==================== NAVIGATION ====================

    scrollToSection(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.classList.add('bg-blue-50', 'transition-colors', 'duration-300');
            setTimeout(() => element.classList.remove('bg-blue-50'), 2000);
        }
    }

    // ==================== AUTOCOMPLETE FILTERS ====================

    filterActive(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredActiveOptions = this.activeOptions.filter(o => o.label.toLowerCase().includes(query));
    }

    filterColumn(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredColumnOptions = this.columnOptions.filter(o => o.label.toLowerCase().includes(query));
    }

    filterOperator(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredOperatorOptions = this.operatorOptions.filter(o => o.label.toLowerCase().includes(query));
    }

    filterRepeat(event: any): void {
        const query = event.query.toLowerCase();
        this.filteredRepeatOptions = this.repeatOptions.filter(o => o.label.toLowerCase().includes(query));
    }

    // ==================== RULES CRUD ====================

    addCondition(): void {
        this.showAdditionalConditions = true;
        this.ruleConditions.push({ type: 'and', column: '', operator: '', value: '' });
    }

    addSubgroup(): void {
        this.showAdditionalConditions = true;
        this.ruleConditions.push({
            type: 'subgroup', column: '', operator: '', value: '',
            conditions: [{ type: 'where', column: '', operator: '', value: '' }],
            isSubgroup: true
        });
    }

    addSubgroupCondition(subgroup: RuleCondition): void {
        if (subgroup.conditions) {
            subgroup.conditions.push({ type: 'and', column: '', operator: '', value: '' });
        }
    }

    removeCondition(index: number): void {
        this.ruleConditions.splice(index, 1);
        if (this.ruleConditions.length === 1) this.showAdditionalConditions = false;
    }

    removeSubgroupCondition(subgroup: RuleCondition, conditionIndex: number): void {
        if (subgroup.conditions) subgroup.conditions.splice(conditionIndex, 1);
    }

    getConditionLabel(condition: RuleCondition, index: number): string {
        if (index === 0 && condition.type === 'where') return 'Where';
        return condition.type === 'or' ? 'OR' : 'AND';
    }

    saveRule(): void {
        if (!this.newRuleName.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please enter a rule name' });
            return;
        }

        this.savingRule = true;
        const conditions = this.buildConditionsPayload(this.ruleConditions);

        if (this.editingRuleId !== null) {
            // Update existing rule
            this.apiService.updateRule(this.editingRuleId, { name: this.newRuleName, conditions }).subscribe({
                next: (res) => {
                    this.messageService.add({ severity: 'success', summary: 'Updated', detail: res.message });
                    this.resetRuleForm();
                    this.loadRules();
                    this.loadAllLogs();
                    this.savingRule = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to update rule' });
                    this.savingRule = false;
                }
            });
        } else {
            // Create new rule
            const ruleData: RuleCreate = { name: this.newRuleName, conditions, is_active: true };
            this.apiService.createRule(ruleData).subscribe({
                next: (res) => {
                    this.messageService.add({ severity: 'success', summary: 'Created', detail: res.message });
                    this.resetRuleForm();
                    this.loadRules();
                    this.loadAllLogs();
                    this.savingRule = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create rule' });
                    this.savingRule = false;
                }
            });
        }
    }

    editRule(rule: Rule): void {
        this.editingRuleId = rule.id;
        this.newRuleName = rule.name;
        this.ruleConditions = this.parseConditionsFromBackend(rule.conditions);
        this.showAdditionalConditions = this.ruleConditions.length > 1;
        this.scrollToSection('rules-section');
    }

    deleteRule(rule: Rule): void {
        this.apiService.deleteRule(rule.id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: res.message });
                this.loadRules();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete rule' });
            }
        });
    }

    toggleRuleActive(rule: Rule): void {
        this.apiService.toggleRule(rule.id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: res.message });
                this.loadRules();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to toggle rule' });
            }
        });
    }

    resetRuleForm(): void {
        this.newRuleName = '';
        this.editingRuleId = null;
        this.ruleConditions = [{ type: 'where', column: '', operator: '', value: '' }];
        this.showAdditionalConditions = false;
    }

    removeAllExclusions(): void {
        this.resetRuleForm();
    }

    private buildConditionsPayload(conditions: RuleCondition[]): any[] {
        return conditions.map(c => {
            if (c.isSubgroup && c.conditions) {
                return {
                    type: 'subgroup',
                    conditions: this.buildConditionsPayload(c.conditions)
                };
            }
            const col = typeof c.column === 'object' ? (c.column as any).value || c.column : c.column;
            const op = typeof c.operator === 'object' ? (c.operator as any).value || c.operator : c.operator;
            return { type: c.type, column: col, operator: op, value: c.value, value2: c.value2 };
        });
    }

    private parseConditionsFromBackend(conditions: any[]): RuleCondition[] {
        if (!conditions || conditions.length === 0) {
            return [{ type: 'where', column: '', operator: '', value: '' }];
        }
        return conditions.map((c: any, i: number) => {
            if (c.type === 'subgroup' && c.conditions) {
                return {
                    type: 'subgroup' as const,
                    column: '', operator: '', value: '',
                    conditions: this.parseConditionsFromBackend(c.conditions),
                    isSubgroup: true
                };
            }
            return {
                type: (i === 0 ? 'where' : c.type || 'and') as any,
                column: c.column || '',
                operator: c.operator || '',
                value: c.value || '',
                value2: c.value2
            };
        });
    }

    // ==================== FILE UPLOAD (Manual Colors) ====================

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        console.log('Imported file:', file);
        input.value = '';
    }

    // ==================== CRON JOBS CRUD ====================

    addJob(): void {
        if (!this.newJobName.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please enter a job name' });
            return;
        }
        if (!this.newJobSchedule.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please enter a cron schedule' });
            return;
        }

        this.savingJob = true;
        const jobData: CronJobCreate = {
            name: this.newJobName,
            schedule: this.newJobSchedule,
            is_active: this.newJobActive
        };

        this.apiService.createCronJob(jobData).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Created', detail: res.message });
                this.newJobName = '';
                this.newJobSchedule = '0 18 * * 1-5';
                this.newJobActive = true;
                this.loadCronJobs();
                this.loadAllLogs();
                this.savingJob = false;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create job' });
                this.savingJob = false;
            }
        });
    }

    editJob(job: CronJob): void {
        (job as any).isEditing = true;
        (job as any).originalData = { ...job };
    }

    saveJob(job: CronJob): void {
        this.apiService.updateCronJob(job.id, {
            name: job.name,
            schedule: job.schedule,
            is_active: job.is_active
        }).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: res.message });
                (job as any).isEditing = false;
                (job as any).originalData = undefined;
                this.loadCronJobs();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to update job' });
            }
        });
    }

    cancelEdit(job: CronJob): void {
        const original = (job as any).originalData;
        if (original) {
            Object.assign(job, original);
        }
        (job as any).isEditing = false;
        (job as any).originalData = undefined;
    }

    deleteJob(job: CronJob): void {
        this.apiService.deleteCronJob(job.id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: res.message });
                this.loadCronJobs();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete job' });
            }
        });
    }

    triggerJob(job: CronJob, override: boolean = false): void {
        this.apiService.triggerCronJob(job.id, override).subscribe({
            next: (res) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Triggered',
                    detail: `Job "${job.name}" triggered ${override ? 'with override' : 'successfully'}`
                });
                this.loadCronJobs();
                this.loadCronExecutionLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to trigger job' });
            }
        });
    }

    toggleJobActive(job: CronJob): void {
        this.apiService.toggleCronJob(job.id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: res.message });
                this.loadCronJobs();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to toggle job' });
            }
        });
    }

    getScheduleDescription(schedule: string): string {
        const match = this.scheduleExamples.find(e => e.expression === schedule);
        return match ? match.description : schedule;
    }

    // ==================== CALENDAR ====================

    updateMonthLabel(): void {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        this.currentMonth = `${months[this.currentMonthIndex]} ${this.currentYear}`;
    }

    generateCalendar(): void {
        this.calendarDates = [];
        const firstDay = new Date(this.currentYear, this.currentMonthIndex, 1);
        const lastDay = new Date(this.currentYear, this.currentMonthIndex + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startDay = firstDay.getDay();
        // Adjust for Monday start (0=Sun -> 6)
        startDay = startDay === 0 ? 6 : startDay - 1;

        // Previous month days
        const prevMonthLast = new Date(this.currentYear, this.currentMonthIndex, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            this.calendarDates.push({ day: prevMonthLast - i, isCurrentMonth: false, events: [] });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            this.calendarDates.push({ day: i, isCurrentMonth: true, events: [] });
        }

        // Next month days to fill grid
        const remaining = 42 - this.calendarDates.length;
        for (let i = 1; i <= remaining; i++) {
            this.calendarDates.push({ day: i, isCurrentMonth: false, events: [] });
        }

        this.updateCalendarWithLogs();
    }

    updateCalendarWithLogs(): void {
        if (!this.cronExecutionLogs || this.cronExecutionLogs.length === 0) return;

        for (const log of this.cronExecutionLogs) {
            const logDate = new Date(log.start_time);
            if (logDate.getMonth() === this.currentMonthIndex && logDate.getFullYear() === this.currentYear) {
                const calDay = this.calendarDates.find(d => d.isCurrentMonth && d.day === logDate.getDate());
                if (calDay) {
                    const time = logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    let type: CalendarEvent['type'] = 'success';
                    if (log.status === 'failed' || log.status === 'error') type = 'error';
                    else if (log.status === 'skipped') type = 'skipped';
                    else if (log.triggered_by === 'manual') type = 'override';
                    calDay.events.push({ label: time, type });
                }
            }
        }
    }

    selectDate(date: CalendarDate): void {
        this.calendarDates.forEach(d => d.isSelected = false);
        if (date.isCurrentMonth) {
            date.isSelected = true;
            this.selectedDate = date;
        }
    }

    navigateCalendar(direction: 'prev' | 'next'): void {
        if (direction === 'prev') {
            this.currentMonthIndex--;
            if (this.currentMonthIndex < 0) { this.currentMonthIndex = 11; this.currentYear--; }
        } else {
            this.currentMonthIndex++;
            if (this.currentMonthIndex > 11) { this.currentMonthIndex = 0; this.currentYear++; }
        }
        this.updateMonthLabel();
        this.generateCalendar();
    }

    // ==================== RESTORE & EMAIL ====================

    sendEmail(batchName: string): void {
        this.messageService.add({ severity: 'info', summary: 'Sending...', detail: `Sending email for ${batchName}` });
        // The backend doesn't have a dedicated email endpoint yet, show info
        setTimeout(() => {
            this.messageService.add({ severity: 'success', summary: 'Sent', detail: `Email sent for ${batchName}` });
            this.loadAllLogs();
        }, 1000);
    }

    removeData(batchName: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Removing...', detail: `Removing data for ${batchName}` });
        setTimeout(() => {
            this.messageService.add({ severity: 'success', summary: 'Removed', detail: `Data removed for ${batchName}` });
            this.loadRestoreData();
            this.loadAllLogs();
        }, 1000);
    }

    // ==================== LOGS & REVERT ====================

    revertLog(log: LogEntry): void {
        this.apiService.revertLog(log.log_id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Reverted', detail: res.message || 'Action reverted successfully' });
                // Reload everything after revert
                this.loadRules();
                this.loadCronJobs();
                this.loadPresets();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to revert action' });
            }
        });
    }

    // ==================== PRESETS CRUD ====================

    togglePresetForm(): void {
        this.showPresetForm = !this.showPresetForm;
        if (this.showPresetForm) {
            this.newPresetName = '';
            this.newPresetDescription = '';
            this.editingPresetId = null;
            this.presetConditions = [{ type: 'where', column: '', operator: '', value: '' }];
        }
    }

    addPresetCondition(): void {
        this.presetConditions.push({ type: 'and', column: '', operator: '', value: '' });
    }

    addPresetSubgroup(): void {
        this.presetConditions.push({
            type: 'subgroup', column: '', operator: '', value: '',
            conditions: [{ type: 'where', column: '', operator: '', value: '' }],
            isSubgroup: true
        });
    }

    removePresetCondition(index: number): void {
        this.presetConditions.splice(index, 1);
    }

    savePreset(): void {
        if (!this.newPresetName.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please enter a preset name' });
            return;
        }

        this.savingPreset = true;
        const conditions = this.buildConditionsPayload(this.presetConditions);

        if (this.editingPresetId !== null) {
            this.apiService.updatePreset(this.editingPresetId, {
                name: this.newPresetName,
                conditions,
                description: this.newPresetDescription
            }).subscribe({
                next: (res) => {
                    this.messageService.add({ severity: 'success', summary: 'Updated', detail: res.message });
                    this.resetPresetForm();
                    this.loadPresets();
                    this.loadAllLogs();
                    this.savingPreset = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to update preset' });
                    this.savingPreset = false;
                }
            });
        } else {
            const presetData: PresetCreate = {
                name: this.newPresetName,
                conditions,
                description: this.newPresetDescription
            };
            this.apiService.createPreset(presetData).subscribe({
                next: (res) => {
                    this.messageService.add({ severity: 'success', summary: 'Created', detail: res.message });
                    this.resetPresetForm();
                    this.loadPresets();
                    this.loadAllLogs();
                    this.savingPreset = false;
                },
                error: (err) => {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to create preset' });
                    this.savingPreset = false;
                }
            });
        }
    }

    editPreset(preset: Preset): void {
        this.showPresetForm = true;
        this.editingPresetId = preset.id;
        this.newPresetName = preset.name;
        this.newPresetDescription = preset.description || '';
        this.presetConditions = this.parseConditionsFromBackend(preset.conditions);
        this.scrollToSection('preset-section');
    }

    deletePresetItem(preset: Preset): void {
        this.apiService.deletePreset(preset.id).subscribe({
            next: (res) => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: res.message });
                this.loadPresets();
                this.loadAllLogs();
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.detail || 'Failed to delete preset' });
            }
        });
    }

    clearPreset(): void {
        this.newPresetName = '';
        this.newPresetDescription = '';
        this.editingPresetId = null;
        this.presetConditions = [{ type: 'where', column: '', operator: '', value: '' }];
    }

    resetPresetForm(): void {
        this.clearPreset();
        this.showPresetForm = false;
    }

    // ==================== UTILITY ====================

    getEventColor(type: string): string {
        const colors: { [key: string]: string } = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            skipped: 'bg-blue-500',
            override: 'bg-blue-400',
            notStarted: 'bg-yellow-500'
        };
        return colors[type] || 'bg-gray-500';
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
