import { Component, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';

interface CollapsedMenuItem {
    label: string;
    icon: string;
    routerLink: string[];
    queryParams?: { [key: string]: string };
    disabled?: boolean;
}

interface CollapsedMenuSection {
    label: string;
    items: CollapsedMenuItem[];
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, TooltipModule, AppMenu],
    template: `
        <!-- Full sidebar with icons + text -->
        <div *ngIf="!isCollapsed" class="layout-sidebar">
            <app-menu></app-menu>
        </div>

        <!-- Collapsed icon-only sidebar -->
        <div *ngIf="isCollapsed" class="layout-sidebar sidebar-collapsed">
            <ng-container *ngFor="let section of collapsedMenu; let si = index">
                <div *ngIf="si > 0" class="section-divider"></div>
                <a *ngFor="let item of section.items"
                   [routerLink]="item.disabled ? null : item.routerLink"
                   [queryParams]="item.queryParams"
                   routerLinkActive="active-route"
                   [routerLinkActiveOptions]="{paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored'}"
                   class="icon-nav-item"
                   [class.disabled]="item.disabled"
                   [pTooltip]="item.label"
                   tooltipPosition="right">
                    <img [src]="item.icon" [alt]="item.label" class="nav-icon" />
                </a>
            </ng-container>
        </div>
    `,
    styles: [
        `
            .layout-sidebar {
                position: fixed;
                width: 17rem;
                height: calc(100vh - 4rem);
                z-index: 999;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-user-select: none;
                user-select: none;
                top: 4rem;
                left: 0;
                background-color: #ffffff;
                border-radius: 0;
                padding: 0.5rem 1.5rem;
                border-right: 1px solid var(--surface-border);
                display: block;
            }

            /* Collapsed state */
            .layout-sidebar.sidebar-collapsed {
                width: 4.5rem;
                padding: 0.75rem 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
            }

            .section-divider {
                width: 70%;
                height: 1px;
                background-color: #e5e7eb;
                margin: 0.5rem 0;
            }

            .icon-nav-item {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2.75rem;
                height: 2.75rem;
                border-radius: 0.625rem;
                cursor: pointer;
                transition: background-color 0.2s ease;
                text-decoration: none;
                color: inherit;
            }

            .icon-nav-item:hover {
                background-color: var(--surface-hover, #f3f4f6);
            }

            .icon-nav-item.active-route {
                background-color: #f0fdf4;
            }

            .icon-nav-item.disabled {
                opacity: 0.4;
                cursor: not-allowed;
                pointer-events: none;
            }

            .nav-icon {
                width: 1.25rem;
                height: 1.25rem;
                object-fit: contain;
            }

            /* Scrollbar styling */
            .layout-sidebar::-webkit-scrollbar {
                width: 6px;
            }

            .layout-sidebar::-webkit-scrollbar-track {
                background: transparent;
            }

            .layout-sidebar::-webkit-scrollbar-thumb {
                background: #d1d5db;
                border-radius: 3px;
            }

            .layout-sidebar::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
            }
        `
    ]
})
export class AppSidebar {
    collapsedMenu: CollapsedMenuSection[] = [
        {
            label: 'Main',
            items: [
                { label: 'Dashboard', icon: 'assets/icon/dashboard.svg', routerLink: ['/home'] },
                { label: 'Security Search', icon: 'assets/icon/security.svg', routerLink: ['/home'], disabled: true },
                { label: 'Color Process', icon: 'assets/icon/colorprocess.svg', routerLink: ['/color-type'] },
                { label: 'Data Statistics', icon: 'assets/icon/data.svg', routerLink: ['/home'], disabled: true }
            ]
        },
        {
            label: 'Settings',
            items: [
                { label: 'Rules', icon: 'assets/icon/rules.svg', routerLink: ['/settings'], queryParams: { section: 'rules' } },
                { label: 'Preset', icon: 'assets/icon/presets.svg', routerLink: ['/settings'], queryParams: { section: 'preset' } },
                { label: 'Cron Jobs', icon: 'assets/icon/cronjob.svg', routerLink: ['/settings'], queryParams: { section: 'cron-jobs' } },
                { label: 'Email & Restore', icon: 'assets/icon/info.svg', routerLink: ['/settings'], queryParams: { section: 'restore-email' } }
            ]
        }
    ];

    constructor(
        public el: ElementRef,
        private layoutService: LayoutService
    ) {}

    get isCollapsed(): boolean {
        return this.layoutService.layoutState().staticMenuDesktopInactive === true
            && this.layoutService.layoutConfig().menuMode === 'static';
    }
}
