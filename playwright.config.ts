// Playwright configuration file, for running E2E tests on the compiled HTML/JS frontend
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    testDir: './tests/e2e',
    timeout: 10000,  // Shorter global timeout
    expect: {
        timeout: 5000,  // Shorter timeout for expect assertions
    },
    // retries: 1,  // Retry failed tests up to 2 times
    workers: 1,  // Run tests serially to avoid Flask server conflicts
    webServer: {
        command: 'python3 app.py --test --port 5001',
        port: 5001,
        reuseExistingServer: false,  // Don't reuse server to avoid debug mode conflicts
        timeout: 10000,  // Server start timeout
    },
    use: {
        baseURL: 'http://127.0.0.1:5001',
        screenshot: 'on', // can be only-on-failure, on, off
        video: 'on', // can be only-on-failure, on, off
        actionTimeout: 5000,  // Timeout for actions like click
        navigationTimeout: 5000,  // Timeout for navigation
        trace: 'retain-on-failure',  // Capture trace on failure
    },
    reporter: [
        ['list'],  // Show progress in terminal
        ['html', { open: 'never' }],  // Generate HTML report
    ],
    fullyParallel: false,  // Disable parallel execution
};

export default config;
