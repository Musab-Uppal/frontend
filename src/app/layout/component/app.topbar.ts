import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { filter, Subscription } from 'rxjs';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, SelectModule, FormsModule],
    template: `
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>

            <a class="layout-topbar-logo flex items-center gap-4" routerLink="/">
                <img src="./assets/logo/logo2.png" alt="Logo" class="layout-topbar-logo-image">

                <!-- Brand -->
                <div class="flex flex-col leading-tight">
                    <span class="font-bold whitespace-nowrap">
                        Market Pulse
                    </span>
                    <span class="text-xs text-gray-500 whitespace-nowrap">
                        Movement Intelligence
                    </span>
                </div>

                <div class="hidden md:block h-6 w-px bg-gray-300"></div>
            </a>

            <!-- PAGE TITLE (HOME ONLY) -->
            <span
                *ngIf="isHomeRoute"
                class="hidden md:block text-base font-bold text-gray-950 whitespace-nowrap">
                CLO Colors Data & Insights
            </span>
        </div>

        <div class="layout-topbar-actions">

            <!-- ASSET SELECTION (HOME ONLY) -->
            <div class="asset-selection" *ngIf="isHomeRoute">
                <p-select
                    [options]="assetOptions"
                    [(ngModel)]="selectedAsset"
                    optionLabel="name"
                    class="asset-selector">
                </p-select>
            </div>

            <!-- Next Run Timer -->
            <div class="next-run">
                <span class="next-run-label">Next Run in</span>
                <span class="next-run-timer">{{ nextRunTimer }}</span>
            </div>

            <!-- User Info -->
            <div class="user-info">
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
                top: 0;
                left: 0;
                right: 0;
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

            .layout-topbar-logo-image {
                height: 2rem;
            }

            .layout-topbar-actions {
                display: flex;
                align-items: center;
                gap: 1.5rem;
            }

            .asset-selection {
                display: flex;
                align-items: center;
            }

            .asset-selector {
                min-width: 120px;
            }

            .next-run {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .next-run-label {
                font-size: 0.75rem;
                color: var(--text-color-secondary);
            }

            .next-run-timer {
                font-size: 0.875rem;
                font-weight: 600;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .user-details {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }

            .user-name {
                font-size: 0.875rem;
                font-weight: 600;
            }

            .user-email {
                font-size: 0.75rem;
                color: var(--text-color-secondary);
            }

            .layout-topbar-action {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 50%;
                border: none;
                background: transparent;
                cursor: pointer;
            }

            :host ::ng-deep .asset-selector .p-dropdown {
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
            }

            @media (max-width: 768px) {
                .asset-selection,
                .next-run,
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
        private router: Router
    ) {}

    ngOnInit(): void {
        // Handle initial load
        this.updateHomeRoute(this.router.url);

        // Handle navigation changes
        this.routerSub = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.updateHomeRoute(event.urlAfterRedirects);
        });
    }

    private updateHomeRoute(url: string): void {
        this.isHomeRoute = url === '/' || url.startsWith('/home');
    }

    ngOnDestroy(): void {
        this.routerSub?.unsubscribe();
    }
}
