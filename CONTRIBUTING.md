# Contributing to HireMe.ai

Thank you for your interest in contributing to HireMe.ai! This guide will help you get started.

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Respect intellectual property
- Report security issues privately

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/yourusername/HireMe.git
cd HireMe
git checkout -b feature/your-feature
```

### 2. Install Dependencies

```bash
npm install

# Firebase emulator setup (for local development)
npm run emulator:start
```

### 3. Start Development Server

```bash
npm run dev
# Opens http://localhost:5173
```

## Development Workflow

### Before Starting Work

1. **Create an issue** - Describe the bug or feature
2. **Get assigned** - Ask maintainers to assign you
3. **Check the roadmap** - Avoid duplicate work
4. **Read relevant docs** - ARCHITECTURE.md, SECURITY.md

### Making Changes

#### 1. Code Style

We use:
- **Prettier** for code formatting
- **ESLint** for linting
- **TypeScript** for type safety

```bash
# Format code
npm run format

# Lint
npm run lint

# Fix linting errors
npm run lint:fix
```

#### 2. Component Structure

```
src/components/
├── MyComponent.tsx       # Component definition
├── MyComponent.module.css # Styles (if needed)
├── MyComponent.types.ts   # TypeScript interfaces
├── hooks/
│   └── useMyComponent.ts # Custom hooks
└── __tests__/
    └── MyComponent.test.tsx # Unit tests
```

#### 3. Creating Components

```typescript
// src/components/MyComponent.tsx
import React, { FC } from 'react';

export interface MyComponentProps {
  title: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
}

/**
 * MyComponent - Does something useful
 * @param props - Component properties
 */
export const MyComponent: FC<MyComponentProps> = ({
  title,
  onSubmit,
  disabled = false,
}) => {
  const handleClick = () => {
    if (onSubmit) {
      onSubmit('value');
    }
  };

  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={handleClick} disabled={disabled}>
        Click me
      </button>
    </div>
  );
};
```

#### 4. Writing Tests

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onSubmit when clicked', async () => {
    const handleSubmit = vi.fn();
    render(<MyComponent title="Test" onSubmit={handleSubmit} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

#### 5. Adding Utilities

```typescript
// src/lib/myUtility.ts
/**
 * Utility function description
 * @param input - Description of input
 * @returns Description of return value
 */
export function myUtility(input: string): string {
  return input.toUpperCase();
}
```

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore

**Examples**:
```bash
git commit -m "feat(auth): add social login with Google"
git commit -m "fix(job-search): filter by salary range"
git commit -m "docs: update deployment guide"
git commit -m "refactor(components): simplify button styling"
```

## Pull Request Process

### 1. Before Submitting

```bash
# Run all checks
npm run test
npm run lint
npm run type-check
npm run build

# All should pass without errors
```

### 2. Create Pull Request

Provide:
- **Title**: Clear, descriptive title
- **Description**: What, why, how
- **Closes**: Link related issues (#123)
- **Screenshots**: For UI changes
- **Testing**: How to verify changes

**PR Template**:
```markdown
## Description
Brief description of changes

## Related Issues
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Description of test coverage

## Screenshots (if applicable)
[Before/After images]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] I have added tests for new features
- [ ] Tests pass locally
- [ ] No new warnings generated
```

### 3. Code Review

Maintainers will:
- Review code quality and architecture
- Check for security issues
- Verify test coverage
- Request changes if needed

Address all feedback before merging.

## Architecture Guidelines

### Folder Structure

```
src/
├── components/          # React components
│   ├── layout/
│   ├── ui/
│   ├── forms/
│   └── __tests__/
├── pages/              # Page components
├── hooks/              # Custom hooks
├── lib/                # Utilities
│   ├── api/
│   ├── firebase/
│   ├── stripe/
│   └── seo.ts
├── types/              # TypeScript types
├── styles/             # Global styles
└── App.tsx
```

### Component Patterns

#### Functional Component Pattern
```typescript
// ✓ Good
const MyComponent: FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState('');
  
  return <div>{state}</div>;
};

// ✗ Avoid
const MyComponent = (props) => {
  const [state, setState] = useState('');
  return <div>{state}</div>;
};
```

#### Custom Hooks
```typescript
// src/hooks/useMyFeature.ts
export function useMyFeature() {
  const [state, setState] = useState('');
  
  const handleChange = useCallback((value: string) => {
    setState(value);
  }, []);
  
  return { state, handleChange };
}
```

#### Compound Components
```typescript
export const CardContainer: FC<Props> = ({ children }) => (
  <div className="card">{children}</div>
);

CardContainer.Header = ({ title }) => <h2>{title}</h2>;
CardContainer.Body = ({ children }) => <div>{children}</div>;
CardContainer.Footer = ({ children }) => <footer>{children}</footer>;

// Usage
<CardContainer>
  <CardContainer.Header title="Title" />
  <CardContainer.Body>Content</CardContainer.Body>
  <CardContainer.Footer>Footer</CardContainer.Footer>
</CardContainer>
```

## Security Considerations

### When Making Changes

1. **Never commit secrets** - API keys, credentials
2. **Validate user input** - Prevent XSS/injection attacks
3. **Use parameterized queries** - For Firestore operations
4. **Check authentication** - Verify user permissions
5. **Encrypt sensitive data** - Passwords, tokens
6. **Sanitize output** - Before rendering user content
7. **Report vulnerabilities** - See SECURITY.md

### Security Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation added
- [ ] Authorization checks included
- [ ] Error messages don't leak info
- [ ] Sensitive data encrypted
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Audit logging added

## Performance Optimization

### Guidelines

1. **Lazy load components**
   ```typescript
   const HeavyComponent = React.lazy(() => import('./Heavy'));
   ```

2. **Memoize expensive operations**
   ```typescript
   const value = useMemo(() => expensiveCalculation(), [deps]);
   ```

3. **Optimize re-renders**
   ```typescript
   const handler = useCallback(() => {}, [deps]);
   const Component = React.memo(MyComponent);
   ```

4. **Code splitting**
   - Automatic with Vite
   - Lazy load routes

5. **Image optimization**
   - Use WebP with fallback
   - Add lazy loading
   - Compress before upload

See PERFORMANCE.md for detailed guide.

## Testing Requirements

### Minimum Coverage

- **New features**: >80% test coverage
- **Bug fixes**: Add regression test
- **Components**: Unit + integration tests
- **Utils**: Unit tests

### Test Types

1. **Unit Tests** - Test individual functions/components
2. **Integration Tests** - Test multiple components together
3. **E2E Tests** - Test complete user flows
4. **Accessibility Tests** - Test a11y compliance

Run tests:
```bash
npm run test                    # Run all tests
npm run test:coverage           # Generate coverage report
npm run test:watch              # Watch mode
npm run e2e                     # Run E2E tests
npm run e2e:debug               # Debug E2E tests
```

## Documentation

### When to Update Docs

- [ ] New features - Add usage examples
- [ ] API changes - Update API docs
- [ ] Breaking changes - Update MIGRATION guide
- [ ] New deployment steps - Update DEPLOYMENT.md
- [ ] Architecture changes - Update ARCHITECTURE.md

### Documentation Style

- Clear, concise language
- Code examples where relevant
- Link to related docs
- Include CLI commands
- Add troubleshooting section

## Submitting Issues

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, browser, version)
- Screenshots/logs

### Feature Requests

Explain:
- What you want to build
- Why it's needed
- How it should work
- Example use cases

## Review Criteria

PRs are merged when they:

- ✅ Follow code style guidelines
- ✅ Have >80% test coverage
- ✅ Pass all CI checks
- ✅ Have security review approval
- ✅ Have documentation updates
- ✅ Are approved by maintainers

## Getting Help

- **Questions**: Open a discussion
- **Bugs**: Create an issue with bug label
- **Security**: Email security@hiremeai.com
- **General**: Join our Discord community

## Release Process

Maintainers handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Deploy to production
5. Post release notes

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Twitter/LinkedIn announcement
- Monthly newsletter

Thank you for making HireMe.ai better! 🚀
