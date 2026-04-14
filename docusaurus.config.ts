import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Perga',
  tagline: 'Personal organizer that helps you plan and organize your days and months efficiently',
  url: 'https://docs.getperga.me',
  baseUrl: '/',

  favicon: 'img/favicon.ico',
  organizationName: 'dbtiunov',
  projectName: 'perga-docs',

  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/dbtiunov/perga-docs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/dbtiunov/perga-docs/tree/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Perga Docs',
      logo: {
        alt: 'Perga Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          href: 'https://demo.getperga.me/',
          label: 'Demo',
          position: 'right',
        },
        {
          href: 'https://getperga.me/',
          label: 'Perga Cloud',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Installation Guide',
              to: '/docs/installation',
            },
            {
              label: 'Perga API',
              to: '/docs/perga-api',
            },
            {
              label: 'Perga Web',
              to: '/docs/perga-web',
            },
          ],
        },
        {
          title: 'GitHub Repositories',
          items: [
            {
              label: 'Perga API Repo',
              href: 'https://github.com/dbtiunov/perga-api',
            },
            {
              label: 'Perga Web Repo',
              href: 'https://github.com/dbtiunov/perga-web',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Demo',
              href: 'https://demo.getperga.me/',
            },
            {
              label: 'Perga Cloud',
              href: 'https://getperga.me/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Perga. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
