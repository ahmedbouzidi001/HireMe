# HireMe.ai Testing Guide

## Testing Strategy

This guide covers unit, integration, and end-to-end testing for HireMe.ai.

## Setup

```bash
# Install testing libraries
npm install --save-dev vitest @testing-library/react @testing-library/user-event

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Unit Tests

### Component Testing

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### Utility Function Testing

```typescript
// src/lib/__tests__/seo.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setSEOTags, generateSlug } from '../seo';

describe('SEO Utilities', () => {
  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = '';
    document.title = '';
  });

  describe('generateSlug', () => {
    it('converts text to URL-friendly slug', () => {
      expect(generateSlug('Job Search Tips')).toBe('job-search-tips');
      expect(generateSlug('AI-Powered Resume')).toBe('ai-powered-resume');
      expect(generateSlug('2026 Top Jobs!')).toBe('2026-top-jobs');
    });

    it('handles special characters', () => {
      expect(generateSlug('C++ Developer')).toBe('c-developer');
      expect(generateSlug('UX/UI Design')).toBe('uxui-design');
    });
  });

  describe('setSEOTags', () => {
    it('sets title and meta tags', () => {
      setSEOTags({
        title: 'Test Page',
        description: 'Test Description',
        keywords: ['test', 'page'],
      });

      expect(document.title).toContain('Test Page');
      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta?.getAttribute('content')).toBe('Test Description');
    });
  });
});
```

## Integration Tests

### API Integration

```typescript
// src/api/__tests__/profile.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeProfileAPI } from '../profile';

describe('Profile API Integration', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  it('analyzes CV and returns profile', async () => {
    const mockResponse = {
      atsScore: 85,
      skills: ['JavaScript', 'React'],
      recommendations: ['Add more metrics'],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await analyzeProfileAPI('CV text');
    
    expect(result.atsScore).toBe(85);
    expect(result.skills).toContain('JavaScript');
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(analyzeProfileAPI('CV')).rejects.toThrow();
  });
});
```

### Firebase Emulator Integration

```typescript
// src/lib/__tests__/firebase.test.ts
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

describe('Firebase Emulator', () => {
  beforeEach(() => {
    const app = initializeApp({
      projectId: 'test-project',
      apiKey: 'test-key',
    });

    const auth = getAuth(app);
    const db = getFirestore(app);

    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
  });

  it('creates and reads user documents', async () => {
    // Test code
  });
});
```

## End-to-End Tests

### Playwright Setup

```bash
npm install --save-dev @playwright/test
npx playwright install

# Run E2E tests
npm run e2e

# Debug mode
npx playwright test --debug
```

### Authentication Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up and log in', async ({ page }) => {
    // Go to sign up page
    await page.goto('http://localhost:5173/signup');
    
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirm"]', 'Password123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Check redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
  });

  it('shows error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    const error = page.locator('text=Invalid credentials');
    await expect(error).toBeVisible();
  });
});
```

### Job Search Flow

```typescript
// e2e/job-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Search', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('user can search and filter jobs', async ({ page }) => {
    await page.goto('http://localhost:5173/jobs');
    
    // Search
    await page.fill('input[placeholder="Search jobs"]', 'React');
    await page.click('button:has-text("Search")');
    
    // Filter
    await page.click('button:has-text("Filters")');
    await page.check('input[value="remote"]');
    
    // Verify results
    await expect(page.locator('text=Senior React Developer')).toBeVisible();
  });

  test('user can apply to job', async ({ page }) => {
    await page.goto('http://localhost:5173/jobs');
    
    // Click apply button
    await page.click('button:has-text("Apply")');
    
    // Verify confirmation
    const modal = page.locator('text=Application submitted');
    await expect(modal).toBeVisible();
  });
});
```

## Performance Testing

### Lighthouse Testing

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('homepage meets performance targets', async ({ page }) => {
  // Collect metrics
  const metrics = await page.evaluate(() => {
    return {
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      lcp: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime || 0,
      cls: 0, // Calculated via PerformanceObserver
    };
  });

  expect(metrics.fcp).toBeLessThan(1800);
  expect(metrics.lcp).toBeLessThan(2500);
});
```

## Security Testing

### OWASP Testing

```typescript
// e2e/security.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test('prevents XSS attacks', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    
    // Try XSS payload
    await page.fill('input[name="name"]', '<script>alert("xss")</script>');
    await page.click('button[type="submit"]');
    
    // Should be escaped/sanitized
    const content = await page.textContent('body');
    expect(content).not.toContain('<script>');
  });

  test('enforces CSRF protection', async ({ page }) => {
    // Verify CSRF token is present
    await page.goto('http://localhost:5173/dashboard');
    
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form');
      return new FormData(form).entries();
    });
    
    const hasCSRFToken = Array.from(formData).some(
      ([key]) => key === '_csrf'
    );
    expect(hasCSRFToken).toBe(true);
  });

  test('protects against timing attacks', async ({ page }) => {
    const times: number[] = [];
    
    // Try different passwords
    for (const password of ['a', 'ab', 'abc']) {
      const start = Date.now();
      
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      
      const duration = Date.now() - start;
      times.push(duration);
    }
    
    // Verify timing is consistent (no timing attack leakage)
    const variance = Math.max(...times) - Math.min(...times);
    expect(variance).toBeLessThan(100); // Should be within 100ms
  });
});
```

## Accessibility Testing

### a11y Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('homepage has no axe violations', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    // Tab through form
    await page.keyboard.press('Tab'); // Email input
    await page.keyboard.type('test@example.com');
    
    await page.keyboard.press('Tab'); // Password input
    await page.keyboard.type('Password123!');
    
    await page.keyboard.press('Tab'); // Submit button
    await page.keyboard.press('Enter');
    
    // Verify login worked
    await expect(page).toHaveURL('**/dashboard');
  });

  test('has proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const name = await button.getAttribute('aria-label') ||
                   await button.textContent();
      expect(name?.trim().length).toBeGreaterThan(0);
    }
  });
});
```

## Test Coverage Goals

- **Overall**: >80% code coverage
- **Critical paths**: >95% coverage
- **UI Components**: >70% coverage
- **Utilities**: >90% coverage
- **API Integration**: >85% coverage

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run test:coverage
      - run: npm run e2e
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Test Data & Fixtures

### Mock Data

```typescript
// src/__tests__/fixtures.ts
export const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  customClaims: { atsScore: 85 },
};

export const mockJob = {
  id: 'job-123',
  title: 'Senior React Developer',
  company: 'Tech Corp',
  location: 'San Francisco',
  salary: { min: 150000, max: 200000 },
  skills: ['React', 'TypeScript', 'Node.js'],
};

export const mockProfile = {
  uid: 'user-123',
  atsScore: 85,
  skills: ['JavaScript', 'React', 'TypeScript'],
  experience: 5,
};
```

## Debugging Tests

```bash
# Run single test
npm run test -- Button.test.tsx

# Run with debug output
npm run test -- --reporter=verbose

# Playwright debug mode
npx playwright test --debug

# Inspect element in test
await page.pause(); // Pauses test for inspection
```

## Best Practices

1. **Write tests for critical paths first**
2. **Use data-testid for fragile selectors**
3. **Test user behavior, not implementation**
4. **Mock external APIs and services**
5. **Keep tests focused and isolated**
6. **Use meaningful assertion messages**
7. **Clean up after tests (afterEach hooks)**
8. **Test accessibility alongside functionality**
9. **Review test coverage regularly**
10. **Update tests when requirements change**

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Expect Matchers](https://jestjs.io/docs/expect)
- [Accessibility Testing](https://www.deque.com/axe/)
