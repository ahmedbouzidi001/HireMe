# HireMe.ai Performance Optimization Guide

## Current Performance Metrics Target

- **Lighthouse Score**: ≥90 (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): ≤2.5s
  - FID (First Input Delay): ≤100ms
  - CLS (Cumulative Layout Shift): ≤0.1
- **Time to Interactive (TTI)**: ≤3.5s
- **First Contentful Paint (FCP)**: ≤1.8s
- **Total Bundle Size**: <200KB gzipped

## Performance Optimizations Implemented

### 1. Bundle Optimization

#### Code Splitting with Vite
```typescript
// Automatic route-based code splitting
const CVBuilder = React.lazy(() => import('./components/CVBuilder'));
const PremiumPage = React.lazy(() => import('./components/PremiumPage'));
```

#### Remove Unused Dependencies
- ✓ Removed `express` (not needed for Vite app)
- ✓ Removed `dotenv` (Vite handles env vars)
- ✓ Removed `@supabase/supabase-js` (migrated to Firebase only)

#### Tree Shaking
- Tailwind CSS purges unused styles via `@layer` directives
- Icons loaded on-demand from lucide-react

### 2. Image Optimization

#### Recommendations
```html
<!-- Use WebP with fallback -->
<picture>
  <source srcset="/image.webp" type="image/webp">
  <img src="/image.png" alt="description" loading="lazy">
</picture>

<!-- Or use modern img attributes -->
<img 
  src="/image.png" 
  alt="description"
  loading="lazy"
  decoding="async"
  width="400"
  height="300"
/>
```

#### Image Compression
```bash
# Install imagemin
npm install -D imagemin imagemin-webp imagemin-mozjpeg

# Compress images
imagemin src/images/*.{png,jpg} --out-dir=public/images
```

### 3. Font Optimization

#### Current Setup
- System fonts via Tailwind (Inter, JetBrains Mono)
- No external font requests
- Proper font-display strategy (swap)

#### Further Optimization
```css
/* In globals.css */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately */
  font-weight: 400;
  font-style: normal;
}
```

### 4. Runtime Performance

#### React Optimization
```typescript
// Use memo for expensive components
export const CVBuilder = React.memo(CVBuilderComponent);

// Use useCallback to prevent unnecessary re-renders
const handleAnalyze = useCallback(async (cv: string) => {
  const profile = await analyzeProfileAPI(cv);
  setProfile(profile);
}, []);

// Use useMemo for expensive computations
const sortedJobs = useMemo(() => {
  return jobs.sort((a, b) => b.score - a.score);
}, [jobs]);
```

#### Firestore Optimization
```typescript
// Use collection limits and pagination
const q = query(
  collection(db, 'applications'),
  where('user_id', '==', userId),
  orderBy('date', 'desc'),
  limit(20)
);

// Index critical queries in Firestore
// - users/{uid} + createdAt
// - users/{uid}/matches + atsScore
```

### 5. CSS Optimization

#### Tailwind CSS v4
- Automatic CSS optimization
- CSS-in-JS eliminated
- Tree-shaking enabled by default

#### Custom CSS
```css
/* Avoid animations on initial load */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Use will-change sparingly */
.animated-element {
  will-change: transform, opacity;
  /* Reset after animation */
  animation-fill-mode: forwards;
}
```

### 6. Network Optimization

#### API Caching Strategy
```typescript
// Cache API responses in Firestore
const getCachedProfile = useCallback(async (userId: string) => {
  const cached = useQuery(['profile', userId], {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  return cached;
}, []);
```

#### Request Batching
```typescript
// Batch multiple API calls
Promise.all([
  analyzeProfileAPI(cv),
  getSubscriptionStatus(),
  searchJobsAPI(role, location)
]);
```

#### Compression
- Gzip compression enabled by default on Firebase Hosting
- Brotli compression for better compression rates

### 7. Critical Rendering Path

#### Optimization Order
1. **HTML** (Critical)
2. **CSS for above-the-fold** (Critical)
3. **Core JS** (High Priority)
4. **Images** (Deferred)
5. **Fonts** (Deferred)
6. **Analytics/Tracking** (Lowest Priority)

### 8. Monitoring & Metrics

#### Using Chrome DevTools
```bash
# Lighthouse audit
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Click "Analyze page load"
```

#### Web Vitals Tracking
```typescript
// Import and track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

#### Firebase Performance Monitoring
```typescript
import { initializePerformanceMonitoring } from 'firebase/performance';

const perf = initializePerformanceMonitoring();
```

## Performance Checklist

### Before Deployment
- [ ] Run Lighthouse audit (target ≥90)
- [ ] Check Core Web Vitals
- [ ] Test on slow 4G network
- [ ] Test on low-end devices (Moto G4)
- [ ] Check bundle size with `npm run build`
- [ ] Verify images are compressed
- [ ] Test accessibility with axe DevTools
- [ ] Check for console errors/warnings

### Code Review
- [ ] No unused imports
- [ ] No console.log in production code
- [ ] Proper React.lazy loading
- [ ] No N+1 queries in Firestore
- [ ] Proper error boundaries
- [ ] Loading states for async operations
- [ ] Debounced search/filter operations

### Server Optimization
- [ ] Enable Gzip compression
- [ ] Set proper cache headers
- [ ] Enable CDN for static assets
- [ ] Monitor Cloud Functions performance
- [ ] Set Firestore indices for common queries

## Common Performance Issues & Fixes

### Issue: Slow Initial Load
**Cause**: Large JavaScript bundle
**Fix**:
```bash
# Analyze bundle
npm run build -- --analyze

# Use dynamic imports
const Module = React.lazy(() => import('./Module'));
```

### Issue: Sluggish Interactions
**Cause**: Blocking JavaScript
**Fix**:
```typescript
// Use requestIdleCallback for non-urgent work
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => {
    // Non-urgent work
  });
}
```

### Issue: Memory Leaks
**Cause**: Unmounted component listeners
**Fix**:
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(doc, (snapshot) => {
    setData(snapshot.data());
  });
  
  // Cleanup
  return () => unsubscribe();
}, []);
```

### Issue: Layout Shift
**Cause**: Images/content loading without reserved space
**Fix**:
```html
<!-- Reserve space for image -->
<div style="width: 400px; height: 300px; background: #f0f0f0;">
  <img src="image.jpg" alt="description" style="width: 100%; height: 100%; object-fit: cover;" />
</div>
```

## Build & Deploy

### Build Optimization
```bash
# Build with source maps for debugging
npm run build

# Analyze bundle size
npm install --save-dev rollup-plugin-visualizer
```

### Deployment on Firebase Hosting
```bash
# Deploy with caching headers
firebase deploy --only hosting

# Check deployed site performance
# Google PageSpeed Insights
# WebPageTest.org
```

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [React Performance](https://react.dev/reference/react/Suspense)
- [Firebase Performance](https://firebase.google.com/docs/perf-mod)
- [Vite Optimization](https://vitejs.dev/guide/assets.html)
- [CSS Performance](https://web.dev/css/)

## Next Steps

1. **Profile the app** - Use Chrome DevTools to identify bottlenecks
2. **Monitor in production** - Set up Firebase Performance Monitoring
3. **Continuous optimization** - Review metrics monthly
4. **User feedback** - Collect performance feedback from users
