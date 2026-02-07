import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { AssetStateService } from 'src/app/services/asset-state.service';
import { filter, Subscription } from 'rxjs';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, SelectModule, FormsModule],
    template: `
    <div class="layout-topbar">
        <!-- LEFT: Logo + Menu toggle + Page title -->
        <div class="layout-topbar-logo-container">
            <a class="layout-topbar-logo" routerLink="/">
                <div class="flex flex-col leading-tight">
                    <span class="font-bold whitespace-nowrap">Market Pulse</span>
                    <span class="text-xs text-gray-500 whitespace-nowrap">
                        Movement Intelligence
                    </span>
                </div>
            </a>

            <!-- MENU TOGGLE (next to logo, outside the <a> tag) -->
            <button
                class="layout-menu-button"
                (click)="onMenuToggle($event)">
                <i class="pi pi-objects-column"></i>
            </button>

            <div class="hidden md:block h-6 w-px bg-gray-300"></div>

            <!-- PAGE TITLE (HOME ONLY) -->
            <span
                *ngIf="isHomeRoute"
                class="hidden md:block text-base font-bold text-gray-950 whitespace-nowrap">
                CLO Colors Data & Insights
            </span>
        </div>

        <!-- RIGHT: Actions -->
        <div class="layout-topbar-actions">

            <!-- ASSET SELECTION -->
            <div class="asset-selection" *ngIf="isHomeRoute">
                <span class="asset-dot"></span>
                <p-select
                    [options]="assetOptions"
                    [(ngModel)]="selectedAsset"
                    optionLabel="name"
                    class="asset-selector"
                    (ngModelChange)="onAssetChange($event)">
                </p-select>
            </div>

            <!-- NEXT RUN TIMER -->
            <div class="next-run-wrapper">
                <span class="next-run-label">Next Run in</span>
                <span class="next-run-timer-pill">{{ nextRunTimer }}</span>
            </div>

            <!-- USER INFO -->
            <div class="user-info">
                <span class="user-divider"></span>
                <div class="user-details">
                    <div class="user-name">Shashank S.</div>
                    <div class="user-email">Shashank.Srivastava@spglobal.com</div>
                </div>
            </div>
        </div>
    </div>
    `,
    styles: [
        `
            .layout-topbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 1rem;
                height: 4rem;
                background-color: var(--surface-card);
                border-bottom: 1px solid var(--surface-border);
                position: fixed;
                inset: 0;
                z-index: 1000;
            }

            .layout-topbar-logo-container {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .layout-topbar-logo {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                text-decoration: none;
                color: inherit;
            }

            .layout-topbar-actions {
                display: flex;
                align-items: center;
                gap: 1.5rem;
            }

            .asset-selection {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.6rem 1rem;
                border-radius: 9999px;
                border: 1px solid #e5e7eb; /* soft gray */
                background: #ffffff;
            }

            .asset-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #22c55e;
            }

            .asset-selector {
                min-width: 110px;
            }

            /* REMOVE INNER BORDER AFTER GREEN DOT */
            :host ::ng-deep .asset-selector .p-dropdown {
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
                padding: 0 !important;
            }

            /* NEXT RUN */
            .next-run-wrapper {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.35rem 0.75rem;
                border-radius: 9999px;
                border: 1px solid var(--surface-border);
                background: var(--surface-card);
            }

            .next-run-label {
                font-size: 0.75rem;
                color: var(--text-color-secondary);
                white-space: nowrap;
            }

            .next-run-timer-pill {
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                border: 1px solid var(--surface-border);
                font-size: 0.875rem;
                font-weight: 600;
                background: var(--surface-card);
                white-space: nowrap;
            }

            /* USER INFO */
            .user-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .user-divider {
                width: 1px;
                height: 2rem;
                background-color: #e5e7eb;
            }

            .user-details {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            .user-name {
                font-size: 0.875rem;
                font-weight: 600;
            }

            .user-email {
                font-size: 0.75rem;
                color: var(--text-color-secondary);
            }

            .layout-menu-button {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 0.5rem;
                border: 1px solid #e5e7eb;
                background: #f9fafb;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s ease;
                margin-left: 0.5rem;
            }

            .layout-menu-button:hover {
                background-color: #e5e7eb;
            }

            .layout-menu-button i {
                font-size: 1.1rem;
                color: #374151;
            }

            @media (max-width: 768px) {
                .asset-selection,
                .next-run-wrapper,
                .user-details {
                    display: none;
                }
            }
        `
    ]
})
export class AppTopbar implements OnInit, OnDestroy {
    items!: MenuItem[];
    nextRunTimer = '7H:52M:25S';

    assetOptions = [
        { name: 'US CLO', value: 'us_clo' },
        { name: 'European CLO', value: 'european_clo' }
    ];

    selectedAsset = this.assetOptions[0];

    isHomeRoute = false;
    private routerSub!: Subscription;

    constructor(
        public layoutService: LayoutService,
        private router: Router,
        private assetStateService: AssetStateService
    ) {}

    ngOnInit(): void {
        this.updateHomeRoute(this.router.url);

        this.routerSub = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.updateHomeRoute(event.urlAfterRedirects);
        });
    }

    private updateHomeRoute(url: string): void {
        this.isHomeRoute = url === '/' || url.startsWith('/home');
    }

    onMenuToggle(event: Event) {
        event.stopPropagation();
        event.preventDefault();
        this.layoutService.onMenuToggle();
    }

    onAssetChange(asset: any) {
        this.assetStateService.setAsset(asset);
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
    }
}
