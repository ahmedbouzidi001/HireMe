# HireMe.ai - AI-Powered Job Search & Career Optimization

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-orange)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-Latest-purple)](https://vitejs.dev/)

**Revolutionize your job search with AI-powered matching, CV optimization, and career coaching**

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Deploy](#deploy) • [Contributing](#contributing)

</div>

---

## Features

### 🤖 AI-Powered Job Matching
- Intelligent job recommendations based on your profile
- ATS score analysis and optimization
- Skill gap identification and recommendations

### 📄 CV & Resume Tools
- AI-powered CV analysis and improvement
- Resume generator with ATS optimization
- Tailored CV creation for specific jobs

### 💼 Career Coaching
- Personalized career advice and guidance
- Interview preparation tips
- Salary negotiation strategies

### 🔐 Premium Features
- Unlimited job searches and applications
- Advanced CV generation
- Career coaching sessions
- Priority job matching
- Application tracking

### ⚡ Modern Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Firebase + Cloud Functions
- **AI**: Google Gemini API
- **Payments**: Stripe Integration
- **Database**: Firestore with RLS
- **Hosting**: Firebase Hosting + CDN

---

## Quick Start

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Firebase account ([create free](https://firebase.google.com/))
- Google Gemini API key ([get key](https://makersuite.google.com/))
- Stripe account for payments ([create free](https://stripe.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmedbouzidi001/HireMe.git
   cd HireMe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173

### Firebase Emulator (Local Development)

```bash
# Start Firebase emulator
npm run emulator:start

# In another terminal
npm run dev
```

Access emulator UI at http://localhost:4000

---

## Documentation

### Core Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, component structure |
| [SECURITY.md](SECURITY.md) | Security practices, Firestore rules, authentication |
| [PERFORMANCE.md](PERFORMANCE.md) | Optimization guide, metrics, monitoring |
| [SEO.md](SEO.md) | SEO optimization, meta tags, structured data |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Firebase deployment, CI/CD, monitoring |
| [TESTING.md](TESTING.md) | Unit, integration, E2E testing guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow, code standards |

### Getting Started Guides

- **[First-time Setup](DEPLOYMENT.md#prerequisites)** - Configure Firebase and environment
- **[Local Development](DEPLOYMENT.md#firebase-configuration)** - Run with emulator
- **[Adding Features](CONTRIBUTING.md#making-changes)** - Development workflow
- **[Testing](TESTING.md)** - Write and run tests
- **[Deployment](DEPLOYMENT.md#deployment-steps)** - Deploy to production

---

## Project Structure

```
src/
├── components/           # React components
│   ├── layout/          # Layout components
│   ├── ui/              # UI components
│   ├── forms/           # Form components
│   └── __tests__/       # Component tests
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities
│   ├── api/             # API client functions
│   ├── firebase/        # Firebase configuration
│   ├── stripe/          # Stripe integration
│   └── seo.ts           # SEO utilities
├── types/               # TypeScript interfaces
├── styles/              # Global styles
└── App.tsx              # Main app component

public/
├── sitemap.xml          # SEO sitemap
└── robots.txt           # Search engine directives

scripts/
├── setup-firestore.ts   # Initialize Firestore
└── deploy.ts            # Deployment utilities
```

---

## Key Technologies

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation
- **SWR** - Data fetching

### Backend
- **Firebase** - Backend-as-a-service
  - Authentication (Email/Password + Custom Claims)
  - Firestore (Document database with RLS)
  - Cloud Storage (File uploads)
  - Cloud Functions (Serverless functions)
- **Google Gemini API** - AI analysis
- **Stripe** - Payment processing

### Development
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Linting
- **Prettier** - Code formatting

---

## NPM Scripts

```bash
# Development
npm run dev                 # Start dev server
npm run emulator:start      # Start Firebase emulator

# Building
npm run build              # Build for production
npm run preview            # Preview production build

# Testing
npm run test               # Run unit tests
npm run test:coverage      # Generate coverage report
npm run test:watch        # Watch mode
npm run e2e               # Run E2E tests

# Code Quality
npm run lint              # Lint code
npm run lint:fix          # Fix linting errors
npm run format            # Format code with Prettier
npm run type-check        # Check TypeScript types

# Deployment
npm run deploy            # Deploy to Firebase
npm run deploy:hosting    # Deploy hosting only
npm run deploy:functions  # Deploy functions only
```

---

## Environment Variables

### Required Variables

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# APIs
VITE_GEMINI_API_KEY=xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Backend (Cloud Functions)
GEMINI_API_KEY=xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

See [.env.example](.env.example) for all variables.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         Frontend (React + Vite)                 │
│  - Components, Pages, Hooks                     │
│  - Firebase SDK                                 │
│  - SEO Optimization                             │
└──────────────┬──────────────────────────────────┘
               │
        ┌──────▼──────┐
        │  Firebase   │
        │ Hosting CDN │
        └──────┬──────┘
               │
┌──────────────┼──────────────────────────────────┐
│              │  Firebase Backend                │
│  ┌───────────▼─────────┐                       │
│  │  Authentication     │ (Email/Password)      │
│  └─────────────────────┘                       │
│  ┌─────────────────────┐                       │
│  │  Firestore Database │ (Realtime)            │
│  │  - Users            │                       │
│  │  - Jobs             │                       │
│  │  - Applications     │                       │
│  │  - Subscriptions    │                       │
│  └─────────────────────┘                       │
│  ┌─────────────────────┐                       │
│  │ Cloud Functions     │ (Serverless)          │
│  │ - CV Analysis       │                       │
│  │ - Job Matching      │                       │
│  │ - Stripe Webhooks   │                       │
│  └─────────────────────┘                       │
│  ┌─────────────────────┐                       │
│  │ Cloud Storage       │ (File uploads)        │
│  └─────────────────────┘                       │
└─────────────────────────────────────────────────┘
        │                          │
        │                    ┌─────▼──────────┐
        │                    │ Google Gemini  │
        │                    │ API (AI)       │
        │                    └────────────────┘
        │
        │                    ┌─────────────────┐
        │                    │ Stripe API      │
        │                    │ (Payments)      │
        │                    └────────────────┘
```

---

## Deploy

### Firebase Hosting (Recommended)

```bash
# Build application
npm run build

# Deploy to Firebase
firebase deploy

# Or use npm script
npm run deploy
```

### Vercel Deployment

```bash
vercel --prod
```

### Docker Deployment

```bash
docker build -t hiremeai .
docker run -p 3000:3000 hiremeai
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## Testing

### Run All Tests

```bash
# Unit tests
npm run test

# With coverage
npm run test:coverage

# E2E tests
npm run e2e

# Watch mode
npm run test:watch
```

### Coverage Goals
- Overall: **>80%**
- Critical paths: **>95%**
- UI Components: **>70%**

See [TESTING.md](TESTING.md) for comprehensive guide.

---

## Security

### Key Features
- ✅ Email/Password authentication with Firebase
- ✅ Custom claims for admin roles
- ✅ Firestore Rules with row-level security
- ✅ Stripe webhook validation
- ✅ XSS and CSRF protection
- ✅ Input sanitization
- ✅ Rate limiting on Cloud Functions
- ✅ Encrypted sensitive data

### Reporting Security Issues

**Do NOT** create a public GitHub issue for security vulnerabilities.

Email: **security@hiremeai.com**

See [SECURITY.md](SECURITY.md) for full security documentation.

---

## Performance

### Target Metrics
- Lighthouse Score: **≥90**
- LCP (Largest Contentful Paint): **≤2.5s**
- FID (First Input Delay): **≤100ms**
- CLS (Cumulative Layout Shift): **≤0.1**
- Bundle Size: **<200KB gzipped**

### Optimization Techniques
- Code splitting with lazy loading
- Image optimization (WebP + compression)
- Font optimization (system fonts)
- CSS optimization (Tailwind v4)
- API caching and batching
- Firestore indexing

See [PERFORMANCE.md](PERFORMANCE.md) for optimization guide.

---

## SEO

### Implementation
- Meta tags and OpenGraph
- Structured data (JSON-LD schemas)
- XML sitemap and robots.txt
- Mobile optimization
- Core Web Vitals optimization
- Multi-language support (en, fr, ar)

### Monitoring
- Google Search Console integration
- Google Analytics tracking
- Lighthouse audits
- Core Web Vitals monitoring

See [SEO.md](SEO.md) for SEO guide.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Code style guide
- Development workflow
- Pull request process
- Testing requirements
- Security guidelines
- Component patterns

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add/update tests
5. Run tests and lint (`npm run test && npm run lint:fix`)
6. Commit with conventional commits (`git commit -m "feat: add feature"`)
7. Push to your fork
8. Open a Pull Request

---

## Roadmap

### Phase 1 ✅ (Completed)
- [x] Security setup (Firestore, Auth, Stripe)
- [x] API integration (Gemini, Stripe)
- [x] Admin dashboard

### Phase 2 ✅ (Completed)
- [x] Firebase migration
- [x] Dependency cleanup
- [x] Architecture optimization

### Phase 3 ✅ (Completed)
- [x] Modern UI/UX redesign
- [x] Performance optimization
- [x] Design system implementation

### Phase 4 ✅ (Completed)
- [x] SEO optimization
- [x] Meta tags & structured data
- [x] Sitemap generation

### Phase 5 ✅ (Completed)
- [x] Comprehensive documentation
- [x] Testing guides
- [x] Deployment automation
- [x] Repository cleanup

### Phase 6 (Planned)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Machine learning integration
- [ ] Marketplace features

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- 📖 **Documentation**: See the [docs](.) folder
- 💬 **Issues**: [GitHub Issues](https://github.com/ahmedbouzidi001/HireMe/issues)
- 📧 **Email**: support@hiremeai.com
- 🐛 **Bug Reports**: [Security.md](SECURITY.md) for vulnerabilities
- 💡 **Feature Requests**: Create an issue with `feature` label

---

## Acknowledgments

- Built with [React](https://react.dev/) and [Firebase](https://firebase.google.com/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Payments by [Stripe](https://stripe.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Firebase Hosting](https://firebase.google.com/docs/hosting/)

---

<div align="center">

**[⬆ Back to Top](#hiremiai---ai-powered-job-search--career-optimization)**

Made with ❤️ by the HireMe.ai team

</div>
