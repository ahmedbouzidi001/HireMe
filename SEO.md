# HireMe.ai SEO Guide

## Overview

This guide covers all SEO optimizations implemented in HireMe.ai to ensure maximum visibility on search engines and social media platforms.

## Core Web Vitals Optimization

### Target Metrics
- **LCP (Largest Contentful Paint)**: ≤2.5s
- **FID (First Input Delay)**: ≤100ms  
- **CLS (Cumulative Layout Shift)**: ≤0.1

See `PERFORMANCE.md` for detailed performance optimizations.

## Technical SEO

### 1. Sitemap & Robots

**Files**:
- `/public/sitemap.xml` - Main sitemap for search engines
- `/public/robots.txt` - Crawling rules and bot directives

**Sitemaps Generated**:
```
1. sitemap.xml - Main pages, dashboard, premium
2. sitemap-jobs.xml - Dynamic job listings (generated server-side)
3. sitemap-blog.xml - Blog posts and articles (generated server-side)
```

**Submission**:
```bash
# Submit to Google Search Console
https://search.google.com/search-console

# Submit to Bing Webmaster Tools
https://www.bing.com/webmasters
```

### 2. Meta Tags

**Automatically Set**:
- `og:title`, `og:description`, `og:image` - Facebook sharing
- `twitter:card`, `twitter:title`, `twitter:description` - Twitter sharing
- `canonical` - Prevent duplicate content issues
- `robots`, `googlebot` - Crawling directives

**Usage**:
```typescript
import { setSEOTags } from './lib/seo';

// In each page component
useEffect(() => {
  setSEOTags({
    title: 'Job Search',
    description: 'Find and apply to jobs with AI matching',
    keywords: ['jobs', 'search', 'employment'],
    ogType: 'website',
  });
}, []);
```

### 3. Structured Data (JSON-LD)

**Implemented Schemas**:

#### Organization Schema
```typescript
import { addOrganizationSchema } from './lib/seo';

// Automatically added on app init
addOrganizationSchema();
```

Provides:
- Company name, logo, contact info
- Social media profiles
- Organization details for knowledge graph

#### Website Schema
```typescript
import { addWebsiteSchema } from './lib/seo';

addWebsiteSchema();
```

Enables:
- Sitelinks in search results
- Search functionality from SERPs

#### Product Schema
```typescript
import { addProductSchema } from './lib/seo';

addProductSchema({
  name: 'HireMe Pro',
  description: 'Premium job search features',
  image: 'https://hiremeai.com/premium.png',
  price: '9.99',
  currency: 'USD',
  rating: 4.8,
  reviewCount: 1250,
});
```

Shows:
- Product information in snippets
- Reviews and ratings
- Price and availability

#### Article Schema
```typescript
import { addArticleSchema } from './lib/seo';

addArticleSchema({
  headline: '10 Tips for Job Search Success',
  description: 'Expert strategies to land your next role',
  image: 'https://hiremeai.com/article.png',
  datePublished: '2026-04-16',
  author: 'Career Coach Team',
  articleBody: '...',
});
```

Benefits:
- Rich results with image and date
- Increased CTR from search results
- Eligible for featured snippets

#### FAQ Schema
```typescript
import { addFAQSchema } from './lib/seo';

addFAQSchema([
  {
    question: 'How does job matching work?',
    answer: 'We use AI to match your skills...',
  },
  // ... more FAQs
]);
```

Shows:
- FAQ rich results in Google Search
- Increased visibility

#### Breadcrumb Schema
```typescript
import { addBreadcrumbSchema } from './lib/seo';

addBreadcrumbSchema([
  { name: 'Home', url: 'https://hiremeai.com' },
  { name: 'Jobs', url: 'https://hiremeai.com/jobs' },
  { name: 'Tech Jobs', url: 'https://hiremeai.com/jobs/tech' },
]);
```

Provides:
- Breadcrumb navigation in SERPs
- Better site structure understanding

### 4. Heading Hierarchy

**Correct Structure**:
```html
<h1>HireMe.ai - Job Search & Career Optimization</h1>
<!-- Only ONE h1 per page -->

<h2>Find Your Perfect Job</h2>
<h3>AI-Powered Matching</h3>
<h3>Smart Recommendations</h3>

<h2>Premium Features</h2>
<h3>Unlimited Searches</h3>
<h3>Career Coaching</h3>
```

**Best Practices**:
- One h1 per page (main topic)
- Hierarchical h2, h3, h4 structure
- Include target keywords naturally
- Use for content organization, not styling

### 5. URL Structure

**SEO-Friendly URLs**:
```
✓ /blog/job-search-tips
✓ /jobs/software-engineer-san-francisco
✓ /premium/pricing-plans

✗ /blog?id=123&post=job-search
✗ /page.php?p=456
✗ /blog/job%20search%20tips
```

**Implementation**:
```typescript
import { generateSlug } from './lib/seo';

const postSlug = generateSlug('Job Search Tips');
// Result: 'job-search-tips'
```

### 6. Image Optimization

**Best Practices**:
- Descriptive alt text for all images
- File size optimization (compress before upload)
- Use WebP format with fallbacks
- Add width/height attributes

```html
<img 
  src="/images/job-search.webp" 
  alt="AI-powered job search interface showing matched positions"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
/>
```

### 7. Mobile Optimization

**Mobile Meta Tags**:
```typescript
import { addMobileMetaTags } from './lib/seo';

addMobileMetaTags();
```

Adds:
- Viewport configuration
- Theme color
- App icon and title
- Status bar styling

**Mobile Checklist**:
- [ ] Responsive design works on all devices
- [ ] Touch targets ≥48px
- [ ] No horizontal scrolling
- [ ] Fast loading (<3s on 4G)
- [ ] Readable font sizes

## On-Page SEO

### 1. Keyword Research & Optimization

**Target Keywords**:
```
Primary: "job search", "career optimization", "AI job matching"
Secondary: "resume", "CV", "job recommendation", "career coach"
Long-tail: "best job search app 2026", "AI resume writer", "job match algorithm"
```

**Placement**:
- Title tag: Front-loaded with main keyword
- Meta description: Include primary keyword
- H1: Natural inclusion of main keyword
- Content: 2-3% keyword density
- Internal links: Descriptive anchor text

### 2. Meta Description

**Format**:
```
120-160 characters, includes CTA
"Find jobs matched to your skills with HireMe.ai's AI engine. Get smart recommendations and land your next role. Try free today!"
```

**Best Practices**:
- Unique for each page
- Include primary keyword
- Add call-to-action
- Match search intent

### 3. Title Tags

**Format**:
```
Primary Keyword | Brand Name
"Software Engineer Jobs | HireMe.ai"
"Job Search App with AI Matching | HireMe.ai"
"Premium Career Coaching Services | HireMe.ai"
```

**Rules**:
- 50-60 characters (fits in SERP)
- Front-load main keyword
- Include brand name
- Avoid keyword stuffing

## Off-Page SEO

### 1. Link Building

**Target High-Authority Backlinks**:
- Tech blogs mentioning AI job search
- Career development websites
- University career services
- Job boards and employment sites

**Link Building Strategies**:
- Guest post on HR/career blogs
- Press releases for major features
- Partnerships with recruitment platforms
- Career resource mentions

### 2. Social Signals

**Optimize Social Sharing**:
- Open Graph images (1200x630px)
- Twitter cards for blog posts
- Shareable quotes and stats
- Call-to-action for sharing

### 3. Local SEO (if applicable)

**For Localized Job Searches**:
```typescript
import { addStructuredData } from './lib/seo';

addStructuredData({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'HireMe.ai San Francisco',
  image: 'https://hiremeai.com/sf-office.jpg',
  areaServed: 'San Francisco, CA',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '123 Main St',
    addressLocality: 'San Francisco',
    addressRegion: 'CA',
    postalCode: '94105',
  },
});
```

## SEO Monitoring

### 1. Google Search Console

**Setup**:
1. Go to https://search.google.com/search-console
2. Add property for hiremeai.com
3. Verify ownership
4. Submit sitemap.xml

**Monitor**:
- Search performance & CTR
- Indexing status
- Crawl errors
- Core Web Vitals
- Manual actions

### 2. Google Analytics

**Track**:
- Organic traffic volume
- User behavior flow
- Conversion rates
- Device/browser performance

```typescript
// Add Google Analytics tracking
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### 3. Tools & Dashboards

**Free Tools**:
- Google Search Console
- Google Analytics
- Google Lighthouse
- Bing Webmaster Tools
- MozBar extension

**Paid Tools**:
- Semrush
- Ahrefs
- SE Ranking
- Moz Pro

## Content Strategy

### 1. Blog Content

**Topics to Target**:
- Job search strategies
- Resume optimization tips
- Career transitions
- Industry insights
- Interview preparation
- Salary negotiation

**Content Structure**:
```
Title (50-60 chars, keyword-rich)
Meta Description (120-160 chars)
H1 (Main topic, keyword)
Introduction (150 words, engaging)
H2 Sections (Supporting keywords)
  - H3 Subsections
  - Bullet points
  - Examples and data
Conclusion (CTA)
Internal links (3-5 relevant)
```

### 2. Internal Linking Strategy

**Link Structure**:
```
Home
├── Blog (Articles)
├── Jobs (Search)
├── Premium (Pricing)
├── Dashboard (For logged-in users)
└── About & Legal
```

**Best Practices**:
- Link to relevant content
- Use descriptive anchor text
- Avoid too many links (confuses crawlers)
- Prioritize important pages

## Content Calendar

### Monthly Deliverables
- 4 blog posts (1 per week)
- 2 SEO-optimized guides
- 1 case study or interview
- SEO audit and reporting

### Seasonal Focus
- **Q1**: New Year's resolutions, career change
- **Q2**: Summer internships, graduation jobs
- **Q3**: Back-to-school, career development
- **Q4**: Year-end reviews, job search trends

## Checklist Before Publishing

- [ ] Title tag optimized (50-60 chars, keyword)
- [ ] Meta description written (120-160 chars, CTA)
- [ ] H1 includes target keyword
- [ ] Headings follow hierarchy (H1→H2→H3)
- [ ] Images optimized with alt text
- [ ] Internal links added (3-5)
- [ ] Content length ≥1000 words (for blog)
- [ ] Keyword density 2-3%
- [ ] Mobile preview checked
- [ ] Structured data added
- [ ] Open Graph image (1200x630px)
- [ ] Canonical URL set
- [ ] Schema validation passed

## Reporting

**Monthly SEO Report**:
- Organic traffic trends
- Keyword rankings
- Top performing pages
- Backlinks acquired
- Technical issues
- Recommendations

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Reference](https://schema.org/)
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [SEO Starter Guide](https://support.google.com/webmasters/answer/7451184)
- [Mobile Friendly Test](https://search.google.com/test/mobile-friendly)
