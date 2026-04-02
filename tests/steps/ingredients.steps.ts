import { createBdd } from 'playwright-bdd';
import { test } from '../support/fixtures';

// All steps for ingredients features are defined in auth.steps.ts and calendar.steps.ts.
// This file exists for future ingredient-specific step definitions.
const { Given: _Given, When: _When, Then: _Then } = createBdd(test);
void _Given; void _When; void _Then;
