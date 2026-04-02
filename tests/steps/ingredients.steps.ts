import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

// All steps for ingredients features are defined in auth.steps.ts and calendar.steps.ts.
// This file exists for future ingredient-specific step definitions.
const { Given, When, Then } = createBdd(test);
