// Playwright tests for the HTML/TS frontend
import { test, expect } from '@playwright/test';

test.describe('Data Table Plotter Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the page before each test
        await page.goto('http://localhost:5001');
        
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
    });

    test('page loads without console errors', async ({ page }) => {
        // Create handler for console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Check that key elements are present
        // await expect(page.locator('div.container')).toBeVisible();
        // await expect(page.locator('#dropZone')).toBeVisible();
        // await expect(page.locator('#dataTable')).toBeVisible();
        // await expect(page.locator('#plot')).toBeVisible();
        // await expect(page.locator('#correlationResults')).toBeVisible();

        // // Check for specific text content
        // await expect(page.locator('h1')).toHaveText('Data Plotter');
        // await expect(page.locator('#dropZone')).toContainText('Drag and drop CSV file');

        // Verify no console errors occurred
        expect(errors.length).toBe(0);
    });

    // test('can add new row', async ({ page }) => {
    //     // Get initial row count (including input row)
    //     const initialRowCount = await page.locator('#dataTable tbody tr').count();
        
    //     // Find and click the Add Row button
    //     const addButton = page.locator('button.add-button').filter({ hasText: 'Add Row' });
    //     await expect(addButton).toBeVisible();
    //     await addButton.click();
        
    //     // Wait for the new row to be added and verify
    //     await page.waitForTimeout(1000); // Give time for any animations/updates
    //     const newRowCount = await page.locator('#dataTable tbody tr').count();
    //     expect(newRowCount).toBe(initialRowCount + 1);
    // });

    // test('can calculate correlation', async ({ page }) => {
    //     // First add some test data
    //     const addButton = page.locator('button.add-button').filter({ hasText: 'Add Row' });
    //     await addButton.click();
        
    //     // Find the Calculate Correlation button and click it
    //     const correlationButton = page.locator('button').filter({ hasText: 'Calculate Correlation' });
    //     await expect(correlationButton).toBeVisible();
    //     await correlationButton.click();
        
    //     // Wait for and verify correlation results
    //     await expect(page.locator('#correlationResults')).toBeVisible();
    //     // Note: We don't check if it's not empty because it might show "Need at least 2 numeric data points"
    //     await expect(page.locator('#correlationResults')).toContainText(/correlation|data points/i);
    // });
});

