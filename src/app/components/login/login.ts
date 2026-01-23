import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-login',
    templateUrl: './login.html',
    styleUrls: ['./login.css'] // keep if you already have it
})
export class Login implements OnInit {
    // 🔹 Track dark mode state
    isDarkMode = false;

    constructor() {}

    // 🔹 Runs when component loads
    ngOnInit(): void {
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // 🔹 Toggle theme from button
    toggleTheme(): void {
        this.isDarkMode = !this.isDarkMode;

        if (this.isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }
}
