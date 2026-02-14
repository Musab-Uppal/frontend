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
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M7.6753 1.77128H1.7713C1.30128 1.77128 0.850801 1.9578 0.519051 2.29023C0.186626 2.62198 0 3.07245 0 3.54248V12.989C0 13.459 0.186621 13.9094 0.519051 14.2412C0.850801 14.5737 1.30128 14.7602 1.7713 14.7602H7.6753V15.941C7.6753 16.2669 7.93975 16.5314 8.26562 16.5314C8.5916 16.5314 8.85605 16.2669 8.85605 15.941V14.7602H14.7601C15.2301 14.7602 15.6806 14.5737 16.0123 14.2412C16.3447 13.9094 16.5312 13.459 16.5312 12.989V3.54248C16.5312 3.07245 16.3447 2.62198 16.0123 2.29023C15.6806 1.9578 15.2301 1.77128 14.7601 1.77128H8.85605V0.590425C8.85605 0.26455 8.5916 0 8.26562 0C7.93975 0 7.6753 0.26455 7.6753 0.590425V1.77128ZM7.6753 2.95202V13.5793H1.7713C1.61476 13.5793 1.46428 13.5173 1.35383 13.4062C1.24289 13.2959 1.18088 13.1453 1.18088 12.9889V3.54235C1.18088 3.38591 1.24289 3.23533 1.35383 3.12488C1.46428 3.01394 1.61478 2.95193 1.7713 2.95193L7.6753 2.95202ZM8.85605 2.95202H14.7601C14.9165 2.95202 15.0671 3.01404 15.1775 3.12497C15.2885 3.23542 15.3505 3.386 15.3505 3.54245V12.9889C15.3505 13.1454 15.2885 13.296 15.1775 13.4063C15.0671 13.5174 14.9165 13.5794 14.7601 13.5794H8.85605V2.95202Z" fill="currentColor"/>
                </svg>
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

            .layout-menu-button svg {
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
