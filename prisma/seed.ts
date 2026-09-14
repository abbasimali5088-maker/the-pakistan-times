import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ACTIONS, MODULES, ROLE_DEFS, permissionCode } from "../src/lib/permissions";
import { seedSettingRows } from "../src/lib/site-settings";
import { makeSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding دی پاکستان ٹائمز...");

  // Permissions
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const code = permissionCode(module, action);
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { module, action, code, description: `${action} ${module}` },
      });
    }
  }

  const allPerms = await prisma.permission.findMany();

  for (const role of ROLE_DEFS) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description, isSystem: true },
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: true,
      },
    });
  }

  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { slug: "super-admin" } });
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: p.id },
    });
  }

  // Role permission subsets
  async function grant(slug: string, codes: string[]) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug } });
    for (const code of codes) {
      const perm = allPerms.find((p) => p.code === code);
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  await grant("editor", [
    "articles.create", "articles.read", "articles.update", "articles.publish", "articles.schedule",
    "categories.read", "tags.read", "tags.create", "media.read", "media.create", "comments.read",
    "breaking.read", "live.read", "dashboard.read",
  ]);
  await grant("reporter", [
    "articles.create", "articles.read", "articles.update", "media.read", "media.create", "dashboard.read",
  ]);
  await grant("moderator", ["comments.read", "comments.update", "comments.delete", "comments.approve", "dashboard.read"]);
  await grant("seo-manager", ["seo.read", "seo.update", "seo.manage", "sitemap.manage", "robots.manage", "redirects.manage", "dashboard.read"]);
  await grant("media-manager", ["media.create", "media.read", "media.update", "media.delete", "media.manage", "videos.manage", "audio.manage", "galleries.manage", "dashboard.read"]);
  await grant("analyst", ["analytics.read", "dashboard.read", "search.read"]);
  await grant("advertisement-manager", ["ads.create", "ads.read", "ads.update", "ads.delete", "ads.manage", "dashboard.read"]);

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "pak123", 12);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@thepakistantimes.local" },
    update: { passwordHash, name: process.env.ADMIN_NAME || "Super Admin", status: "active" },
    create: {
      email: process.env.ADMIN_EMAIL || "admin@thepakistantimes.local",
      username: "admin",
      passwordHash,
      name: process.env.ADMIN_NAME || "Super Admin",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdmin.id },
  });

  const site = await prisma.site.upsert({
    where: { slug: "urdu" },
    update: { name: "دی پاکستان ٹائمز اردو", isDefault: true, language: "ur" },
    create: {
      name: "دی پاکستان ٹائمز اردو",
      slug: "urdu",
      language: "ur",
      timezone: "Asia/Karachi",
      isDefault: true,
      status: "active",
    },
  });
  await prisma.site.upsert({
    where: { slug: "english" },
    update: { name: "The Pakistan Times", language: "en" },
    create: {
      name: "The Pakistan Times",
      slug: "english",
      language: "en",
      timezone: "Asia/Karachi",
      isDefault: false,
      status: "active",
    },
  });

  const author = await prisma.author.upsert({
    where: { slug: "staff-desk" },
    update: { name: "اسٹاف ڈیسک", userId: admin.id },
    create: {
      name: "اسٹاف ڈیسک",
      slug: "staff-desk",
      email: admin.email,
      bio: "دی پاکستان ٹائمز اردو کی ادارتی ٹیم",
      position: "News Desk",
      status: "active",
      userId: admin.id,
    },
  });

  const categoryDefs = [
    { name: "Pakistan", nameUr: "پاکستان", slug: "pakistan", sortOrder: 1 },
    { name: "World", nameUr: "دنیا", slug: "world", sortOrder: 2 },
    { name: "Politics", nameUr: "سیاست", slug: "politics", sortOrder: 3 },
    { name: "Business", nameUr: "بزنس", slug: "business", sortOrder: 4 },
    { name: "Sports", nameUr: "سپورٹس", slug: "sports", sortOrder: 5 },
    { name: "Technology", nameUr: "ٹیکنالوجی", slug: "technology", sortOrder: 6 },
    { name: "History", nameUr: "تاریخ و علم", slug: "history", sortOrder: 7 },
    { name: "Entertainment", nameUr: "انٹرٹینمنٹ", slug: "entertainment", sortOrder: 8 },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const row = await prisma.category.upsert({
      where: { siteId_slug: { siteId: site.id, slug: c.slug } },
      update: { name: c.name, nameUr: c.nameUr, sortOrder: c.sortOrder, status: "active" },
      create: {
        siteId: site.id,
        name: c.name,
        nameUr: c.nameUr,
        slug: c.slug,
        sortOrder: c.sortOrder,
        status: "active",
        description: `${c.nameUr} کی تازہ ترین خبریں`,
      },
    });
    categories[c.slug] = row.id;
  }

  // Sports subcategories
  for (const [name, nameUr, slug] of [
    ["Cricket", "کرکٹ", "cricket"],
    ["Football", "فٹبال", "football"],
    ["Other Sports", "دیگر کھیل", "other-sports"],
  ] as const) {
    await prisma.category.upsert({
      where: { siteId_slug: { siteId: site.id, slug } },
      update: { parentId: categories.sports, name, nameUr },
      create: {
        siteId: site.id,
        parentId: categories.sports,
        name,
        nameUr,
        slug,
        status: "active",
        sortOrder: 1,
      },
    });
  }

  const tags = ["breaking", "exclusive", "economy", "election", "cricket", "climate"];
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { slug: t },
      update: {},
      create: { name: t, slug: t, usageCount: 0 },
    });
  }

  const settings = seedSettingRows({
    defaultAuthorId: author.id,
    defaultCategoryId: categories.pakistan,
    uploadMaxMb: process.env.UPLOAD_MAX_MB || "10",
  });

  for (const [group, key, value] of settings) {
    await prisma.setting.upsert({
      where: { siteId_group_key: { siteId: site.id, group, key } },
      // Don't wipe editor-entered social/contact URLs on re-seed
      update:
        group === "social" || group === "general" || group === "footer"
          ? {}
          : { value },
      create: { siteId: site.id, group, key, value },
    });
  }

  const menu = await prisma.menu.upsert({
    where: { id: "main-menu-seed" },
    update: { name: "Main", location: "main", status: "active", siteId: site.id },
    create: {
      id: "main-menu-seed",
      siteId: site.id,
      name: "Main Navigation",
      location: "main",
      status: "active",
    },
  });

  await prisma.menuItem.deleteMany({ where: { menuId: menu.id } });
  const menuItems = [
    { label: "Home", labelUr: "ہوم", url: "/", sortOrder: 0 },
    { label: "Latest", labelUr: "تازہ ترین", url: "/latest", sortOrder: 1 },
    { label: "Pakistan", labelUr: "پاکستان", url: "/category/pakistan", sortOrder: 2 },
    { label: "World", labelUr: "دنیا", url: "/category/world", sortOrder: 3 },
    { label: "Politics", labelUr: "سیاست", url: "/category/politics", sortOrder: 4 },
    { label: "Sports", labelUr: "سپورٹس", url: "/category/sports", sortOrder: 5 },
    { label: "Business", labelUr: "بزنس", url: "/category/business", sortOrder: 6 },
    { label: "Technology", labelUr: "ٹیکنالوجی", url: "/category/technology", sortOrder: 7 },
    { label: "Videos", labelUr: "ویڈیوز", url: "/videos", sortOrder: 8 },
    { label: "Galleries", labelUr: "تصاویر", url: "/galleries", sortOrder: 9 },
    { label: "Live", labelUr: "لائیو", url: "/live", sortOrder: 10 },
  ];
  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: { menuId: menu.id, ...item, status: "active", target: "_self" },
    });
  }

  const legal = [
    ["about", "About Us", "ہمارے بارے میں", "دی پاکستان ٹائمز اردو ایک آزاد خبر رساں ادارہ ہے۔"],
    ["privacy", "Privacy Policy", "پرائیویسی پالیسی", "ہم قارئین کی پرائیویسی کا احترام کرتے ہیں۔"],
    ["terms", "Terms of Use", "شرائط و ضوابط", "ویب سائٹ کے استعمال کی شرائط۔"],
    ["disclaimer", "Disclaimer", "ڈس کلیمر", "خبریں ممکنہ حد تک درست پیش کی جاتی ہیں۔"],
    ["contact", "Contact", "رابطہ", "ای میل: news@thepakistantimes.local"],
    ["editorial-policy", "Editorial Policy", "ادارتی پالیسی", "ہم حقائق کی بنیاد پر رپورٹنگ کرتے ہیں۔"],
    ["corrections-policy", "Corrections Policy", "تصحیحات کی پالیسی", "غلطی کی صورت میں جلد از جلد تصحیح کی جاتی ہے۔"],
  ] as const;

  for (const [slug, title, titleUr, body] of legal) {
    await prisma.staticPage.upsert({
      where: { slug },
      update: { title, body: `${titleUr}\n\n${body}`, bodyUr: body, status: "published" },
      create: {
        slug,
        title,
        body: `${titleUr}\n\n${body}`,
        bodyUr: body,
        status: "published",
        seoTitle: `${titleUr} | دی پاکستان ٹائمز اردو`,
      },
    });
  }

  const sampleArticles = [
    {
      title: "اسلام آباد: قومی اسمبلی میں اہم بل پیش",
      titleEn: "Key bill presented in National Assembly",
      excerpt: "حکومت نے قومی اسمبلی میں اہم اقتصادی اصلاحات کا بل پیش کر دیا۔",
      category: "politics",
      priority: "high",
      tags: ["election", "economy"],
    },
    {
      title: "کراچی میں شدید بارش، الرٹ جاری",
      titleEn: "Heavy rain alert issued for Karachi",
      excerpt: "محکمہ موسمیات نے کراچی اور ساحلی علاقوں کے لیے الرٹ جاری کیا ہے۔",
      category: "pakistan",
      priority: "breaking",
      tags: ["breaking", "climate"],
    },
    {
      title: "پاکستان کی معیشت میں نئی پیش رفت",
      titleEn: "Fresh developments in Pakistan economy",
      excerpt: "ماہرین نے برآمدات اور ترسیلات زر میں بہتری کی نشاندہی کی۔",
      category: "business",
      priority: "normal",
      tags: ["economy"],
    },
    {
      title: "عالمی سطح پر امن مذاکرات تیز",
      titleEn: "Global peace talks gather pace",
      excerpt: "بین الاقوامی سطح پر سفارتی سرگرمیاں تیز ہو گئی ہیں۔",
      category: "world",
      priority: "normal",
      tags: ["exclusive"],
    },
    {
      title: "قومی ٹیم کی شاندار فتح",
      titleEn: "National team seals emphatic win",
      excerpt: "پاکستان کرکٹ ٹیم نے اہم میچ میں شاندار کارکردگی دکھائی۔",
      category: "sports",
      priority: "high",
      tags: ["cricket"],
    },
    {
      title: "نئی ٹیک کمپنیوں کا فروغ",
      titleEn: "Tech startups gain momentum",
      excerpt: "پاکستان میں ٹیکنالوجی اسٹارٹ اپس کو نئی سرمایہ کاری مل رہی ہے۔",
      category: "technology",
      priority: "normal",
      tags: ["exclusive"],
    },
  ];

  let order = 0;
  for (const a of sampleArticles) {
    const slug = makeSlug(a.titleEn);
    let article = await prisma.article.findFirst({ where: { slug, siteId: site.id } });
    if (article) {
      article = await prisma.article.update({
        where: { id: article.id },
        data: {
          title: a.titleEn,
          titleUr: a.title,
          excerpt: a.titleEn,
          excerptUr: a.excerpt,
          body: `<p>${a.titleEn}</p><p>${a.excerpt}</p><p>This sample article is part of The Pakistan Times CMS seed data.</p>`,
          bodyUr: `<p>${a.excerpt}</p><p>مکمل رپورٹ جلد آ رہی ہے۔</p>`,
        },
      });
    }
    if (!article) {
      const media = await prisma.media.create({
        data: {
          filename: `${slug}.jpg`,
          originalName: `${slug}.jpg`,
          path: `/uploads/${slug}.jpg`,
          url: `https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=675&fit=crop&sig=${order}`,
          mimeType: "image/jpeg",
          size: 120000,
          width: 1200,
          height: 675,
          alt: a.title,
          type: "image",
          uploadedById: admin.id,
        },
      });
      article = await prisma.article.create({
        data: {
          site: { connect: { id: site.id } },
          title: a.titleEn,
          titleUr: a.title,
          slug,
          excerpt: a.titleEn,
          excerptUr: a.excerpt,
          body: `<p>${a.titleEn}</p><p>${a.excerpt}</p><p>This sample article is part of The Pakistan Times CMS seed data.</p>`,
          bodyUr: `<p>${a.excerpt}</p><p>مکمل رپورٹ جلد آ رہی ہے۔</p>`,
          language: "ur",
          status: "published",
          workflowStep: "published",
          priority: a.priority,
          category: { connect: { id: categories[a.category] } },
          author: { connect: { id: author.id } },
          createdBy: { connect: { id: admin.id } },
          updatedBy: { connect: { id: admin.id } },
          featuredImage: { connect: { id: media.id } },
          publishedAt: new Date(Date.now() - order * 3600_000),
          publishAt: new Date(Date.now() - order * 3600_000),
          isFeatured: order === 0,
          isBreaking: a.priority === "breaking",
          seoTitle: `${a.title} | دی پاکستان ٹائمز اردو`,
          seoDescription: a.excerpt,
          ogTitle: a.title,
          ogDescription: a.excerpt,
          schemaType: "NewsArticle",
        },
      });
    }

    for (const tagSlug of a.tags) {
      const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
      if (!tag) continue;
      await prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: article.id, tagId: tag.id } },
        update: {},
        create: { articleId: article.id, tagId: tag.id },
      });
      await prisma.tag.update({ where: { id: tag.id }, data: { usageCount: { increment: 1 } } });
    }

    const revCount = await prisma.articleRevision.count({ where: { articleId: article.id } });
    if (revCount === 0) {
      await prisma.articleRevision.create({
        data: {
          articleId: article.id,
          version: 1,
          title: article.title,
          body: article.body,
          excerpt: article.excerpt,
          snapshot: JSON.stringify(article),
          note: "Initial publish",
          userId: admin.id,
        },
      });
    }

    if (order < 3) {
      const existingBlock = await prisma.homepageBlock.findFirst({
        where: { siteId: site.id, articleId: article.id, sectionKey: order === 0 ? "top_story" : "secondary" },
      });
      if (!existingBlock) {
        await prisma.homepageBlock.create({
          data: {
            siteId: site.id,
            sectionKey: order === 0 ? "top_story" : "secondary",
            title: order === 0 ? "Top Story" : "Secondary",
            articleId: article.id,
            sortOrder: order,
            isVisible: true,
            priority: 10 - order,
          },
        });
      }
    }
    order += 1;
  }

  const breakingCount = await prisma.breakingNews.count();
  if (breakingCount === 0) {
    await prisma.breakingNews.create({
      data: {
        headline: "کراچی میں شدید بارش، الرٹ جاری",
        headlineUr: "کراچی میں شدید بارش، الرٹ جاری",
        priority: 1,
        status: "active",
        startAt: new Date(Date.now() - 3600_000),
        endAt: new Date(Date.now() + 6 * 3600_000),
        authorId: admin.id,
        approverId: admin.id,
      },
    });
  }

  let live = await prisma.liveStory.findUnique({ where: { slug: "live-national-assembly" } });
  if (!live) {
    live = await prisma.liveStory.create({
      data: {
        title: "لائیو: قومی اسمبلی کا اجلاس",
        slug: "live-national-assembly",
        description: "اجلاس کی براہ راست کوریج",
        status: "live",
        categoryId: categories.politics,
        startAt: new Date(),
      },
    });
    await prisma.liveUpdate.createMany({
      data: [
        {
          liveStoryId: live.id,
          body: "اجلاس شروع ہو گیا ہے۔",
          type: "text",
          isImportant: true,
          status: "published",
        },
        {
          liveStoryId: live.id,
          body: "ممالک کے نمائندے اسمبلی میں پہنچ رہے ہیں۔",
          type: "text",
          isPinned: true,
          status: "published",
        },
      ],
    });
  }

  await prisma.video.upsert({
    where: { slug: "today-headlines-video" },
    update: {},
    create: {
      title: "ویڈیو: آج کی اہم خبریں",
      slug: "today-headlines-video",
      description: "روزانہ بریفنگ",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnail: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800",
      duration: 180,
      categoryId: categories.pakistan,
      authorId: author.id,
      status: "published",
    },
  });

  let gallery = await prisma.gallery.findUnique({ where: { slug: "karachi-rain-gallery" } });
  if (!gallery) {
    gallery = await prisma.gallery.create({
      data: {
        title: "تصاویر: کراچی کی بارش",
        slug: "karachi-rain-gallery",
        description: "شہر بھر سے تصاویر",
        coverUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800",
        authorId: author.id,
        status: "published",
      },
    });
    await prisma.galleryItem.createMany({
      data: [
        {
          galleryId: gallery.id,
          imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200",
          caption: "سڑکوں پر پانی جمع",
          sortOrder: 0,
        },
        {
          galleryId: gallery.id,
          imageUrl: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=1200",
          caption: "بادل چھائے ہوئے",
          sortOrder: 1,
        },
      ],
    });
  }

  const adCount = await prisma.advertisement.count({ where: { unitKey: "home_leaderboard" } });
  if (adCount === 0) {
    await prisma.advertisement.create({
      data: {
        name: "Homepage Leaderboard",
        unitKey: "home_leaderboard",
        imageUrl: "https://placehold.co/728x90/0B7A3B/fff?text=Ad+Slot",
        targetUrl: "/contact",
        device: "all",
        priority: 1,
        status: "active",
      },
    });
  }

  const listCount = await prisma.newsletterList.count();
  if (listCount === 0) {
    await prisma.newsletterList.create({
      data: { name: "Daily Brief", status: "active" },
    });
  }

  for (const provider of ["google_analytics", "search_console", "smtp"]) {
    await prisma.integration.upsert({
      where: { provider },
      update: {},
      create: { provider, configJson: "{}", status: "disabled" },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || "pak123"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
