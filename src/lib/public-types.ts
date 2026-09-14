export type PublicImage = {
  id?: string;
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  nameUr?: string | null;
  nameEn?: string | null;
  slug: string;
  description?: string | null;
  children?: PublicCategory[];
  _count?: { articles?: number };
};

export type PublicAuthor = {
  id: string;
  name: string;
  slug: string;
  photoUrl?: string | null;
  bio?: string | null;
  position?: string | null;
  website?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
};

export type PublicTag = {
  id: string;
  name: string;
  nameUr?: string | null;
  slug: string;
  description?: string | null;
};

export type PublicArticle = {
  id: string;
  title: string;
  titleUr?: string | null;
  titleEn?: string | null;
  slug: string;
  subtitle?: string | null;
  excerpt?: string | null;
  excerptUr?: string | null;
  excerptEn?: string | null;
  body?: string | null;
  bodyUr?: string | null;
  bodyEn?: string | null;
  language?: string;
  status?: string;
  priority?: string;
  location?: string | null;
  imageCaption?: string | null;
  imageCredit?: string | null;
  publishAt?: string | Date | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date;
  viewCount?: number;
  isFeatured?: boolean;
  isBreaking?: boolean;
  href?: string;
  seo?: {
    title?: string | null;
    description?: string | null;
    canonical?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
    schemaType?: string;
  };
  category?: PublicCategory | null;
  author?: PublicAuthor | null;
  image?: PublicImage | null;
  tags?: PublicTag[];
  coAuthors?: PublicAuthor[];
  relations?: { type: string; article: PublicArticle }[];
};

export type Paginated<T> = {
  items: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

export type MenuItem = {
  id: string;
  label: string;
  labelUr?: string | null;
  url: string;
  target?: string;
  sortOrder?: number;
  children?: MenuItem[];
};

export type MenuPayload = {
  id: string;
  name: string;
  location: string;
  items: MenuItem[];
};

export type BreakingItem = {
  id: string;
  headline: string;
  headlineUr?: string | null;
  headlineEn?: string | null;
  priority?: number;
  status?: string;
  articleId?: string | null;
  article?: PublicArticle | null;
  href?: string | null;
};

export type HomepageBlock = {
  id: string;
  sectionKey: string;
  title?: string | null;
  sortOrder?: number;
  priority?: number;
  isVisible?: boolean;
  article?: PublicArticle | null;
  configJson?: string | null;
};

export type HomepagePayload = {
  blocks: HomepageBlock[];
  sections?: Record<string, HomepageBlock[]>;
};

export type StaticPage = {
  id: string;
  title: string;
  slug: string;
  body: string;
  bodyUr?: string | null;
  status?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type LiveStory = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  status?: string;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  category?: PublicCategory | null;
  updates?: LiveUpdate[];
};

export type LiveUpdate = {
  id: string;
  body: string;
  type?: string;
  mediaUrl?: string | null;
  quote?: string | null;
  location?: string | null;
  isPinned?: boolean;
  isImportant?: boolean;
  publishedAt?: string | Date | null;
};

export type VideoItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  url: string;
  thumbnail?: string | null;
  duration?: number | null;
  provider?: string;
  status?: string;
  category?: PublicCategory | null;
  author?: PublicAuthor | null;
};

export type GalleryItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  status?: string;
  author?: PublicAuthor | null;
  items?: {
    id: string;
    imageUrl: string;
    caption?: string | null;
    credit?: string | null;
  }[];
};

export type AdUnit = {
  id: string;
  name: string;
  unitKey: string;
  code?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
};
