import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

const { Given, When, Then } = createBdd(test);

// --- Registration steps ---

Given('I am on the registration page', async ({ page }) => {
  await page.goto('/register');
});

Then('I should see the registration form', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
});

Then('I should see a display name input', async ({ page }) => {
  await expect(page.getByPlaceholder('Display name')).toBeVisible();
});

Then('I should see an email input', async ({ page }) => {
  await expect(page.getByPlaceholder('Email')).toBeVisible();
});

Then('I should see a password input', async ({ page }) => {
  await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();
});

Then('I should see a confirm password input', async ({ page }) => {
  await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
});

Then('I should see a create account button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});

Then('I should see a link to the login page', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

// --- Login steps ---

Given('I am on the login page', async ({ page }) => {
  await page.goto('/login');
});

Then('I should see the login form', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

Then('I should see an email input on the login page', async ({ page }) => {
  await expect(page.getByPlaceholder('Email')).toBeVisible();
});

Then('I should see a password input on the login page', async ({ page }) => {
  await expect(page.getByPlaceholder('Password')).toBeVisible();
});

Then('I should see a sign in button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

Then('I should see a link to the registration page', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
});

// --- Protected route steps ---

Given('I am not authenticated', async ({ page }) => {
  await page.context().clearCookies();
});

When('I navigate to the calendar page', async ({ page }) => {
  await page.goto('/calendar');
});

When('I navigate to the ingredients page', async ({ page }) => {
  await page.goto('/ingredients');
});

When('I navigate to the settings page', async ({ page }) => {
  await page.goto('/settings');
});

Then('I should be redirected to the login page', async ({ page }) => {
  await expect(page).toHaveURL(/\/login/);
});
