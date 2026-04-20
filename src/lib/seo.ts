/**
 * SEO Utilities for HireMe.ai
 * Manages meta tags, structured data, and SEO best practices
 */

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  locale?: string;
}

const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://hiremeai.com';
const SITE_NAME = 'HireMe.ai';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Set meta tags for a page
 */
export function setSEOTags(config: SEOConfig) {
  // Title
  document.title = `${config.title} | ${SITE_NAME}`;
  setMetaTag('og:title', config.title);
  setMetaTag('twitter:title', config.title);

  // Description
  setMetaTag('description', config.description);
  setMetaTag('og:description', config.description);
  setMetaTag('twitter:description', config.description);

  // Keywords
  setMetaTag('keywords', config.keywords.join(', '));

  // Canonical
  if (config.canonical) {
    setCanonical(config.canonical);
  } else {
    setCanonical(window.location.href);
  }

  // Open Graph
  setMetaTag('og:type', config.ogType || 'website');
  setMetaTag('og:image', config.ogImage || DEFAULT_OG_IMAGE);
  setMetaTag('og:url', window.location.href);
  setMetaTag('og:site_name', SITE_NAME);
  setMetaTag('og:locale', config.locale || 'en_US');

  // Twitter
  setMetaTag('twitter:card', config.twitterCard || 'summary_large_image');
  setMetaTag('twitter:image', config.ogImage || DEFAULT_OG_IMAGE);
  setMetaTag('twitter:site', '@hiremeai');
  setMetaTag('twitter:creator', '@hiremeai');

  // Author & Dates
  if (config.author) {
    setMetaTag('article:author', config.author);
  }
  if (config.publishedDate) {
    setMetaTag('article:published_time', config.publishedDate);
  }
  if (config.modifiedDate) {
    setMetaTag('article:modified_time', config.modifiedDate);
  }

  // Robots & Indexing
  setMetaTag('robots', 'index, follow');
  setMetaTag('googlebot', 'index, follow');
}

/**
 * Helper to set or update meta tag
 */
function setMetaTag(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`) ||
                document.querySelector(`meta[property="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    const isProperty = name.startsWith('og:') || name.startsWith('article:');
    if (isProperty) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Set canonical URL
 */
function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Add structured data (JSON-LD)
 */
export function addStructuredData(data: any) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Organization Structured Data
 */
export function addOrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HireMe.ai',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'AI-powered job search and career optimization platform',
    sameAs: [
      'https://twitter.com/hiremeai',
      'https://linkedin.com/company/hiremeai',
      'https://github.com/hiremeai',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-xxx-xxx-xxxx',
      contactType: 'Customer Service',
      email: 'support@hiremeai.com',
    },
  };

  addStructuredData(schema);
}

/**
 * Website Structured Data
 */
export function addWebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HireMe.ai',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  addStructuredData(schema);
}

/**
 * Product/Service Structured Data
 */
export function addProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  rating?: number;
  reviewCount?: number;
}) {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: 'HireMe.ai',
    },
    offers: {
      '@type': 'Offer',
      url: SITE_URL,
      priceCurrency: product.currency,
      price: product.price,
      availability: 'https://schema.org/InStock',
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      },
    }),
  };

  addStructuredData(schema);
}

/**
 * Article Structured Data
 */
export function addArticleSchema(article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  articleBody?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'HireMe.ai',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    description: article.description,
    ...(article.articleBody && {
      articleBody: article.articleBody,
    }),
  };

  addStructuredData(schema);
}

/**
 * Breadcrumb Structured Data
 */
export function addBreadcrumbSchema(items: { name: string; url: string }[]) {
  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  addStructuredData(schema);
}

/**
 * FAQ Structured Data
 */
export function addFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  const mainEntity = faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };

  addStructuredData(schema);
}

/**
 * Generate SEO-friendly URL slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * SEO Config for common pages
 */
export const SEO_PAGES = {
  home: {
    title: 'HireMe.ai - AI-Powered Job Search & Career Optimization',
    description:
      'Get matched with jobs, generate targeted CVs, and optimize your career with AI-powered insights.',
    keywords: [
      'job search',
      'career',
      'CV generator',
      'job matching',
      'AI',
      'recruitment',
    ],
    ogType: 'website' as const,
  },

  dashboard: {
    title: 'Dashboard - HireMe.ai',
    description: 'Manage your profile, job searches, and applications.',
    keywords: ['dashboard', 'profile', 'job applications', 'career'],
  },

  jobs: {
    title: 'Job Search - HireMe.ai',
    description:
      'AI-powered job search with smart matching and recommendations.',
    keywords: ['jobs', 'job search', 'job matching', 'employment'],
  },

  premium: {
    title: 'Premium - HireMe.ai',
    description:
      'Unlock unlimited job searches, CV generations, and career coaching.',
    keywords: ['premium', 'subscription', 'career coaching', 'job assistance'],
  },

  about: {
    title: 'About HireMe.ai',
    description: 'Learn more about HireMe.ai and our mission to revolutionize job search.',
    keywords: ['about', 'company', 'mission', 'team'],
  },

  blog: {
    title: 'Blog - HireMe.ai',
    description: 'Tips, insights, and strategies for successful job searching.',
    keywords: ['blog', 'tips', 'career advice', 'job search strategies'],
  },
};

/**
 * Mobile App Meta Tags
 */
export function addMobileMetaTags() {
  // Viewport
  setMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5');

  // Theme Color
  setMetaTag('theme-color', '#7c3aed');

  // Apple
  setMetaTag('apple-mobile-web-app-capable', 'yes');
  setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
  setMetaTag('apple-mobile-web-app-title', 'HireMe.ai');

  // Android
  setMetaTag('mobile-web-app-capable', 'yes');
}

/**
 * Preload Critical Resources
 */
export function preloadCriticalResources() {
  // Preload fonts
  const linkFont = document.createElement('link');
  linkFont.rel = 'preload';
  linkFont.as = 'style';
  linkFont.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
  document.head.appendChild(linkFont);

  // Preload critical images
  const linkImage = document.createElement('link');
  linkImage.rel = 'preload';
  linkImage.as = 'image';
  linkImage.href = DEFAULT_OG_IMAGE;
  document.head.appendChild(linkImage);
}

/**
 * Initialize all SEO enhancements
 */
export function initSEO() {
  addMobileMetaTags();
  addOrganizationSchema();
  addWebsiteSchema();
  preloadCriticalResources();
}
